import * as cheerio from "cheerio";

import { safeHttpUrl } from "../url";

const ORIGIN = "https://autosolar.co";
const USER_AGENT = "Mozilla/5.0 (compatible; ZeusCatalogBot/0.1; +https://zeus.local/bot)";
const MIN_INTERVAL_MS = 1000; // 1 petición por segundo
// Rutas que su robots.txt veda a todos los bots.
const DISALLOWED = ["/crm/", "/cart", "/account/", "/search"];

export type Spec = { label: string; value: string };

export type ScrapedProduct = {
  sourceUrl: string;
  sku: string | null;
  name: string;
  description: string | null;
  specs: Spec[];
  datasheetUrl: string | null;
  imageUrls: string[];
  category: string | null;
  brand: string | null;
  supplierPrice: number;
  inStock: boolean;
};

const CDN_ORIGIN = "https://cdn.autosolar.co";
const CDN_INTERVAL_MS = 250;
const lastRequestAt = new Map<string, number>();

async function throttle(host: string, interval: number) {
  const wait = (lastRequestAt.get(host) ?? 0) + interval - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt.set(host, Date.now());
}

function assertAllowed(url: string) {
  const u = new URL(url);
  if (u.origin !== ORIGIN) throw new Error(`Origen no permitido: ${u.origin}`);
  if (DISALLOWED.some((p) => u.pathname.startsWith(p))) throw new Error(`Ruta vedada por robots.txt: ${u.pathname}`);
}

export async function fetchText(url: string, retries = 2): Promise<string> {
  assertAllowed(url);
  for (let attempt = 0; ; attempt++) {
    await throttle(ORIGIN, MIN_INTERVAL_MS);
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xml" }, signal: AbortSignal.timeout(30_000) });
      if (new URL(res.url).origin !== ORIGIN) throw new Error(`Redirección fuera de ${ORIGIN}: ${res.url}`);
      if (res.ok) return await res.text();
      if (res.status === 404 || attempt >= retries) throw new Error(`HTTP ${res.status} en ${url}`);
    } catch (e) {
      if (attempt >= retries) throw e;
    }
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
}

/** Descarga una imagen del CDN de Autosolar (solo ese origen). */
export async function fetchImage(url: string): Promise<{ data: Buffer; contentType: string }> {
  if (new URL(url).origin !== CDN_ORIGIN) throw new Error(`Imagen fuera del CDN esperado: ${url}`);
  await throttle(CDN_ORIGIN, CDN_INTERVAL_MS);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(30_000) });
  if (new URL(res.url).origin !== CDN_ORIGIN) throw new Error(`Redirección fuera de ${CDN_ORIGIN}: ${res.url}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return { data: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get("content-type") ?? "image/jpeg" };
}

/** URLs de producto del sitemap: dos segmentos (`/{categoría}/{producto}`), sin blog. */
export async function discoverProductUrls(): Promise<string[]> {
  const xml = await fetchText(`${ORIGIN}/sitemap`);
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const seen = new Set<string>();
  for (const u of urls) {
    if (!u.startsWith(`${ORIGIN}/`)) continue;
    const segs = new URL(u).pathname.split("/").filter(Boolean);
    if (segs.length !== 2 || segs[0].startsWith("blog")) continue;
    seen.add(u);
  }
  return [...seen];
}

const toText = (html: string) => cheerio.load(`<div>${html}</div>`)("div").text().replace(/\s+/g, " ").trim();

/** Los precios llegan como "615409.00" (JSON-LD) o "$615.409" (HTML, punto de miles). */
function parsePrice(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  const n = /^\d+(\.\d{1,2})?$/.test(s) ? Number(s) : Number(s.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** El JSON-LD de Autosolar trae caracteres de control sin escapar: se neutralizan antes de parsear. */
function readProductLd($: cheerio.CheerioAPI): Record<string, any> | null {
  let found: Record<string, any> | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const j = JSON.parse($(el).text().replace(/[\u0000-\u001f]+/g, " "));
      for (const n of Array.isArray(j["@graph"]) ? j["@graph"] : [j]) {
        const t = n?.["@type"];
        if (t === "Product" || (Array.isArray(t) && t.includes("Product"))) found = n;
      }
    } catch {
      /* bloque inválido: se ignora */
    }
  });
  return found;
}

function readSpecs($: cheerio.CheerioAPI): Spec[] {
  const specs: Spec[] = [];
  $("table tr").each((_, tr) => {
    const text = $(tr).text().replace(/\s+/g, " ").replace(/^[\s➞→>-]+/, "").trim();
    const i = text.indexOf(":");
    if (i > 0) specs.push({ label: text.slice(0, i).trim(), value: text.slice(i + 1).trim() });
  });
  return specs.filter((s) => s.label && s.value);
}

function readImages($: cheerio.CheerioAPI, ld: Record<string, any>): string[] {
  const out = new Set<string>();
  for (const i of [ld.image].flat()) if (typeof i === "string") out.add(i);
  // La galería usa miniaturas "-thumb"; la imagen completa es la misma URL sin ese sufijo.
  $("img").each((_, e) => {
    const s = $(e).attr("data-src") || $(e).attr("src") || "";
    if (/cdn\.autosolar\.co\/images\/\d+\//.test(s)) out.add(s.replace(/-thumb(\.\w+)$/, "$1"));
  });
  return [...out].slice(0, 6);
}

/** Devuelve null si la página no es un producto vendible (sin Product en JSON-LD o sin precio). */
export function parseProduct(html: string, url: string): ScrapedProduct | null {
  const $ = cheerio.load(html);
  const ld = readProductLd($);
  if (!ld) return null;
  const supplierPrice = parsePrice(ld.offers?.price) ?? parsePrice($(".product-price").first().text());
  const name = toText(String(ld.name ?? $("h1").first().text()));
  if (!supplierPrice || !name) return null;

  const description = ld.description ? toText(String(ld.description)) : toText($("#description").html() ?? "");
  const availability = String(ld.offers?.availability ?? "");
  const pdf = $('a[href$=".pdf"]').first().attr("href");

  return {
    sourceUrl: url,
    sku: ld.sku != null ? String(ld.sku) : null,
    name,
    description: description || null,
    specs: readSpecs($),
    datasheetUrl: safeHttpUrl(pdf, url),
    imageUrls: readImages($, ld),
    category: ld.category ? toText(String(ld.category)) : null,
    brand: ld.brand?.name ? toText(String(ld.brand.name)) : null,
    supplierPrice,
    inStock: !availability.includes("OutOfStock"),
  };
}

export async function scrapeProduct(url: string): Promise<ScrapedProduct | null> {
  return parseProduct(await fetchText(url), url);
}

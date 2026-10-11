import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../prisma";
import { effectiveCommission, salePrice } from "../pricing";
import { getGlobalCommission } from "../settings";
import { slugify } from "../slug";
import { classifyProduct } from "../catalog/classify";
import { putPublic, storageConfigured } from "../storage";
import { discoverProductUrls, fetchImage, scrapeProduct, type ScrapedProduct } from "../scraper/autosolar";

type StoredImage = { src: string; url: string };

const NO_MANUFACTURER = { name: "Sin fabricante", slug: "sin-fabricante" };

async function manufacturerId(brand: string | null) {
  const { name, slug } = brand ? { name: brand, slug: slugify(brand) || NO_MANUFACTURER.slug } : NO_MANUFACTURER;
  const m = await prisma.manufacturer.upsert({ where: { slug }, update: {}, create: { name, slug } });
  return m.id;
}

// Si el almacenamiento rechaza las subidas (cuota agotada, credenciales revocadas), se deja de intentar
// en este proceso en vez de fallar una vez por cada imagen de cada producto.
let storageBlocked = false;

/** Copia las imágenes al almacenamiento propio. Sin STORAGE_* no copia nada (no enlazamos las de Autosolar). */
export async function copyImages(slug: string, sources: string[], existing: StoredImage[]): Promise<StoredImage[]> {
  if (!storageConfigured() || storageBlocked) return existing;
  const bySrc = new Map(existing.map((i) => [i.src, i]));
  const out: StoredImage[] = [];
  for (const [i, src] of sources.entries()) {
    const done = bySrc.get(src);
    if (done) {
      out.push(done);
      continue;
    }
    try {
      const { data, contentType } = await fetchImage(src);
      const ext = (/\.(\w{3,4})$/.exec(new URL(src).pathname)?.[1] ?? "jpg").toLowerCase();
      const hash = createHash("sha1").update(src).digest("hex").slice(0, 8);
      out.push({ src, url: await putPublic(`products/${slug}/${i}-${hash}.${ext}`, data, contentType) });
    } catch (e) {
      const msg = (e as Error).message;
      if (/suspended|blocked|quota|limit|AccessDenied|Forbidden|InvalidAccessKey|SignatureDoesNotMatch/i.test(`${(e as Error).name} ${msg}`)) {
        storageBlocked = true;
        console.warn(`El almacenamiento no acepta más subidas (${msg}). Se omiten las imágenes pendientes en esta corrida.`);
        return [...out, ...existing.filter((x) => !out.some((o) => o.src === x.src))];
      }
      console.warn(`Imagen omitida (${src}): ${msg}`);
    }
  }
  return out;
}

export async function upsertScraped(p: ScrapedProduct, globalPct: number): Promise<"created" | "updated"> {
  const existing = await prisma.product.findUnique({ where: { sourceUrl: p.sourceUrl } });

  let slug = existing?.slug ?? slugify(new URL(p.sourceUrl).pathname.split("/").filter(Boolean).pop() ?? p.name);
  if (!existing && (await prisma.product.findUnique({ where: { slug } }))) slug = `${slug}-${p.sku ?? Date.now()}`;

  const pct = effectiveCommission(existing?.commissionPct == null ? null : Number(existing.commissionPct), globalPct);
  const images = await copyImages(slug, p.imageUrls, (existing?.images as StoredImage[] | undefined) ?? []);

  const data = {
    name: p.name,
    sku: p.sku,
    description: p.description,
    specs: p.specs as unknown as Prisma.InputJsonValue,
    datasheetUrl: p.datasheetUrl,
    images: images as unknown as Prisma.InputJsonValue,
    category: p.category,
    manufacturerId: await manufacturerId(p.brand),
    supplierPrice: p.supplierPrice,
    price: salePrice(p.supplierPrice, pct),
    inStock: p.inStock,
    ...classifyProduct({ name: p.name, sourceUrl: p.sourceUrl, specs: p.specs }),
    lastSyncedAt: new Date(),
  };

  if (existing) {
    await prisma.product.update({ where: { id: existing.id }, data });
    return "updated";
  }
  await prisma.product.create({ data: { ...data, slug, source: "autosolar", sourceUrl: p.sourceUrl } });
  return "created";
}

export type SyncStep = { runId: string; cursor: number; total: number; done: boolean; created: number; updated: number; failed: number };

/**
 * Procesa un lote de productos y devuelve el avance. Reanuda la corrida en curso (SyncRun.cursor)
 * o crea una nueva; así sirve igual al comando, al botón (en bucle) y al cron.
 */
export async function syncStep(opts: { size: number; limit?: number; budgetMs?: number }): Promise<SyncStep> {
  const started = Date.now();
  const urls = (await discoverProductUrls()).sort();
  const total = opts.limit ? Math.min(opts.limit, urls.length) : urls.length;

  const run = (await prisma.syncRun.findFirst({ where: { status: "running" }, orderBy: { startedAt: "desc" } })) ?? (await prisma.syncRun.create({ data: {} }));
  const globalPct = await getGlobalCommission();

  let { cursor, created, updated, failed } = run;
  const end = Math.min(cursor + opts.size, total);
  for (; cursor < end; cursor++) {
    if (opts.budgetMs && Date.now() - started > opts.budgetMs) break;
    try {
      const scraped = await scrapeProduct(urls[cursor]);
      if (!scraped) continue; // no es un producto vendible (página sin Product o sin precio)
      if ((await upsertScraped(scraped, globalPct)) === "created") created++;
      else updated++;
    } catch (e) {
      failed++;
      console.warn(`Falló ${urls[cursor]}: ${(e as Error).message}`);
    }
  }

  const done = cursor >= total;
  await prisma.syncRun.update({
    where: { id: run.id },
    data: { cursor, created, updated, failed, ...(done ? { status: "done", finishedAt: new Date() } : {}) },
  });
  return { runId: run.id, cursor, total, done, created, updated, failed };
}

/** Recalcula el precio de venta de los productos importados tras cambiar la comisión global. */
export async function recalculatePrices(): Promise<number> {
  const globalPct = await getGlobalCommission();
  const items = await prisma.product.findMany({ where: { source: "autosolar", supplierPrice: { not: null } } });
  let n = 0;
  for (const p of items) {
    const price = salePrice(Number(p.supplierPrice), effectiveCommission(p.commissionPct == null ? null : Number(p.commissionPct), globalPct));
    if (price !== Number(p.price)) {
      await prisma.product.update({ where: { id: p.id }, data: { price } });
      n++;
    }
  }
  return n;
}

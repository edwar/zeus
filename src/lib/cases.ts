import { z } from "zod";
import { slugify } from "@/lib/slug";

/**
 * Casos reales (testimonios con ahorro verificado). La regla que manda: un caso NO se publica sin la autorización del
 * cliente, sin cómo se verificó el ahorro y sin cifras coherentes. `missingForPublish` es esa regla, y la usan el
 * servidor (que la exige) y la pantalla (que le dice al equipo qué falta).
 */
export const CASE_AUDIENCES = ["home", "business", "community"] as const;
export type CaseAudience = (typeof CASE_AUDIENCES)[number];
export const CASE_SYSTEMS = ["ongrid", "hybrid", "offgrid"] as const;
export const MAX_PHOTOS = 6;

const text = (max: number) => z.string().trim().max(max);
const optText = (max: number) => z.union([text(max), z.null()]).optional().transform((v) => (v ? v : null));

/** Lo que el equipo puede editar. Un borrador admite campos a medias: solo el título es obligatorio para guardar. */
export const caseBody = z.object({
  titleEs: text(120).min(3),
  titleEn: text(120).default(""),
  summaryEs: text(600).default(""),
  summaryEn: text(600).default(""),
  quoteEs: optText(500),
  quoteEn: optText(500),
  displayName: text(80).default(""),
  audience: z.enum(CASE_AUDIENCES).default("home"),
  town: text(80).default(""),
  department: optText(80),
  kwp: z.number().min(0).max(1000).default(0),
  systemType: z.enum(CASE_SYSTEMS).default("ongrid"),
  installedOn: z.iso.date().nullable().default(null),
  billBefore: z.number().int().min(0).max(1_000_000_000).default(0),
  billAfter: z.number().int().min(0).max(1_000_000_000).default(0),
  evidence: text(500).default(""),
  verifiedOn: z.iso.date().nullable().default(null),
});
export type CaseBody = z.infer<typeof caseBody>;

export const consentBody = z.discriminatedUnion("given", [
  z.object({ given: z.literal(true), note: text(300).min(10) }),
  z.object({ given: z.literal(false) }),
]);

export type PublishCheck = {
  titleEs: string; summaryEs: string; displayName: string; town: string; kwp: number; installedOn: string | null;
  billBefore: number; billAfter: number; evidence: string; verifiedOn: string | null; consentAt: unknown; consentNote: string | null;
};
export type Missing = "title" | "summary" | "displayName" | "town" | "kwp" | "installedOn" | "bills" | "savings" | "evidence" | "verifiedOn" | "verifiedBeforeInstall" | "consent";

/** Qué falta para poder publicar (vacío = listo). Los campos en inglés son opcionales: sin ellos la versión en inglés usa el texto en español. */
export function missingForPublish(c: PublishCheck, today = new Date().toISOString().slice(0, 10)): Missing[] {
  const out: Missing[] = [];
  if (c.titleEs.trim().length < 3) out.push("title");
  if (c.summaryEs.trim().length < 20) out.push("summary");
  if (c.displayName.trim().length < 2) out.push("displayName");
  if (c.town.trim().length < 2) out.push("town");
  if (!(c.kwp > 0)) out.push("kwp");
  if (!c.installedOn || c.installedOn > today) out.push("installedOn");
  if (!(c.billBefore > 0)) out.push("bills");
  else if (!(c.billAfter < c.billBefore)) out.push("savings"); // un caso de ahorro tiene que ahorrar
  if (c.evidence.trim().length < 20) out.push("evidence");
  if (!c.verifiedOn || c.verifiedOn > today) out.push("verifiedOn");
  else if (c.installedOn && c.verifiedOn < c.installedOn) out.push("verifiedBeforeInstall"); // no se verifica un ahorro antes de instalar
  if (!c.consentAt || (c.consentNote ?? "").trim().length < 10) out.push("consent");
  return out;
}

/** Ahorro mensual y porcentaje a partir de las dos facturas verificadas. */
export function savingsOf(before: number, after: number): { amount: number; pct: number } {
  const amount = Math.max(0, before - after);
  return { amount, pct: before > 0 ? Math.round((amount / before) * 100) : 0 };
}

/** Slug a partir del título, único entre los que ya existen (`-2`, `-3`…). */
export function uniqueSlug(title: string, taken: ReadonlySet<string>): string {
  const base = slugify(title).slice(0, 60) || "caso";
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** Tipo real de una imagen según sus primeros bytes (no se confía en el tipo que declara el navegador). */
export function sniffImage(b: Uint8Array): { ext: "jpg" | "png" | "webp"; type: string } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", type: "image/png" };
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return { ext: "webp", type: "image/webp" };
  return null;
}

export type CasePhoto = { url: string; alt: string };

/** Texto en el idioma de la página; si falta el inglés, el español (mejor eso que una ficha en blanco). */
export const pick = (lang: string, es: string | null | undefined, en: string | null | undefined) => (lang === "en" && en?.trim() ? en : es ?? "");

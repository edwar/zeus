import { sniffImage } from "@/lib/cases";

/** Tipos de documento de un proyecto. La lista es fija: ordena la pestaña y el portal. */
export const DOC_KINDS = ["plan", "permit", "certificate", "contract", "other"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export const DOC_MAX_BYTES = 4_000_000; // Vercel corta los cuerpos de más de 4,5 MB
export const DOC_MAX_PER_PROJECT = 40;

/** Tipo real de un archivo según sus primeros bytes (PDF o imagen). El tipo que declara el navegador no cuenta. */
export function sniffDocument(b: Uint8Array): { ext: string; type: string } | null {
  if (b.length > 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return { ext: "pdf", type: "application/pdf" };
  return sniffImage(b);
}

/** Nombre de archivo seguro para la cabecera de descarga: sin rutas, sin comillas ni saltos de línea. */
export function safeFileName(name: string, fallback: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const clean = base.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, " ").trim().replace(/^\.+/, "").slice(0, 100);
  return clean || fallback;
}

/** Videos de la guía del equipo: archivos de `docs/guia-equipo/videos/`, servidos solo con sesión (no están en `public/`). */
export const GUIDE_VIDEO_FILE = /^[a-z0-9][a-z0-9-]{0,60}\.(webm|mp4|jpg)$/;
export const GUIDE_VIDEO_TYPES: Record<string, string> = { webm: "video/webm", mp4: "video/mp4", jpg: "image/jpeg" };

/** Interpreta una cabecera `Range: bytes=…` sobre un archivo de `size` bytes. null = sin rango o no se entiende (se envía completo). */
export function parseRange(header: string | null, size: number): { start: number; end: number } | "invalid" | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header ?? "");
  if (!m || (m[1] === "" && m[2] === "")) return null;
  let start: number;
  let end: number;
  if (m[1] === "") {
    // «últimos N bytes»
    const n = Number(m[2]);
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  return start > end || start >= size ? "invalid" : { start, end };
}

/** Pasos de la guía del comprador (landing) que traen video: índice del paso → archivo en `public/guia/` (`<archivo>.<idioma>.webm|mp4|jpg`) y clave de su texto. */
export const STEP_VIDEOS: Record<number, { file: string; key: "kit" | "request" | "accept" | "follow" }> = {
  0: { file: "01-armar-kit", key: "kit" },
  1: { file: "02-pedir-cotizacion", key: "request" },
  3: { file: "04-aceptar-cotizacion", key: "accept" },
  5: { file: "06-seguir-proyecto", key: "follow" },
};

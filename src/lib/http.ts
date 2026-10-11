/** Rechaza (413) los cuerpos que declaran un tamaño mayor al permitido, antes de leerlos en memoria. */
export function tooLarge(req: Request, maxBytes: number): Response | null {
  const len = Number(req.headers.get("content-length"));
  return Number.isFinite(len) && len > maxBytes ? Response.json({ error: "too_large" }, { status: 413 }) : null;
}

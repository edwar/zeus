/**
 * Quita de las descripciones importadas las frases que nombran a Autosolar (p. ej. "En nuestra web
 * AutoSolar Energía del Perú…"): no deben publicarse con la marca del proveedor. La base conserva el original.
 */
export function cleanDescription(text: string | null): string | null {
  if (!text) return null;
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => !/autosolar/i.test(s));
  return sentences.join(" ").trim() || null;
}

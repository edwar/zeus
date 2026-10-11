/**
 * Solo se permiten enlaces http(s). Cualquier otro esquema (`javascript:`, `data:`, `vbscript:`…) en un `href`
 * ejecutaría código al hacer clic. Se resuelven rutas relativas contra `base` (p. ej. la página que se está leyendo).
 */
export function safeHttpUrl(input: string | null | undefined, base?: string): string | null {
  if (!input) return null;
  try {
    const u = new URL(input.trim(), base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

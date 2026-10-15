/**
 * Máscara de pesos mientras se escribe: 1200000 → 1'200.000 (punto para los miles, apóstrofo para los millones).
 * El valor "crudo" que guarda el formulario son solo dígitos; la máscara es solo para mostrar.
 */

/** Deja solo los dígitos, sin ceros a la izquierda (salvo un único 0). */
export function moneyDigits(input: string | number | null | undefined): string {
  if (typeof input === "number") input = Math.round(input); // los pesos van sin decimales
  const d = String(input ?? "").replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return d.slice(0, 15);
}

/** "1200000" → "1'200.000". */
export function formatMoney(raw: string): string {
  let out = "";
  for (let i = raw.length, g = 0; i > 0; i -= 3, g++) {
    const part = raw.slice(Math.max(0, i - 3), i);
    out = part + (out ? (g % 2 === 1 ? "." : "'") + out : "");
  }
  return out;
}

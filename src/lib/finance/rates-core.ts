/** Lógica pura sobre las tasas públicas de la Superfinanciera (sin red): se prueba por separado. */

export type RateRow = { nombre_entidad: string; nombre_tipo_entidad?: string; tasa_efectiva_promedio: string; montos_desembolsados: string; numero_de_creditos: string };
export type BankRate = { name: string; type: string; rateEA: number; credits: number };

/** Plazos que usa la Superfinanciera en los créditos de consumo de libre inversión ("Consumo otros"). */
export const TERMS = [12, 24, 36, 48, 60, 72, 84] as const;

export function termBucket(months: number): string {
  if (months <= 12) return "Entre 31 días y 1 año";
  if (months <= 36) return "Más de 1 año y hasta 3 años";
  if (months <= 60) return "Más de 3 años y hasta 5 años";
  return "Más de 5 años y hasta 7 años";
}

/** Minúsculas con la primera letra de cada palabra en mayúscula, sin el prefijo "BC-" de la Superfinanciera. */
export function entityType(raw?: string): string {
  const t = (raw ?? "").replace(/^[A-Z]{2,3}\s*-\s*/, "").trim().toLowerCase();
  return t.replace(/(^|\s)\p{L}+/gu, (w, sp: string) => { const word = w.slice(sp.length); return sp + (/^(de|del|la|las|los|y)$/.test(word) ? word : word[0].toUpperCase() + word.slice(1)); });
}

/**
 * Tasa efectiva anual promedio de cada entidad, ponderada por el monto desembolsado.
 * Se descartan entidades con menos de `minCredits` créditos (una tasa con 1 o 2 créditos no es una referencia) y datos inválidos.
 */
export function weightedByEntity(rows: RateRow[], minCredits = 5): BankRate[] {
  const acc = new Map<string, { type: string; w: number; sum: number; credits: number }>();
  for (const r of rows) {
    const rate = Number(r.tasa_efectiva_promedio);
    const amount = Number(r.montos_desembolsados);
    const credits = Number(r.numero_de_creditos);
    if (!r.nombre_entidad || !(rate > 0 && rate < 100) || !(amount > 0) || !(credits > 0)) continue;
    const e = acc.get(r.nombre_entidad) ?? { type: entityType(r.nombre_tipo_entidad), w: 0, sum: 0, credits: 0 };
    e.w += amount;
    e.sum += rate * amount;
    e.credits += credits;
    acc.set(r.nombre_entidad, e);
  }
  return [...acc.entries()]
    .filter(([, e]) => e.credits >= minCredits)
    .map(([name, e]) => ({ name, type: e.type, rateEA: Math.round((e.sum / e.w) * 100) / 100, credits: e.credits }))
    .sort((a, b) => a.rateEA - b.rateEA);
}

/** Promedio de todas las entidades ponderado por número de créditos: la referencia "del mercado". */
export function marketAverage(banks: BankRate[]): number | null {
  const credits = banks.reduce((n, b) => n + b.credits, 0);
  if (credits === 0) return null;
  return Math.round((banks.reduce((n, b) => n + b.rateEA * b.credits, 0) / credits) * 100) / 100;
}

/** Tasa de usura = 1,5 × interés bancario corriente (efectivo anual). */
export const usuryFromIbc = (ibcPct: number) => Math.round(ibcPct * 1.5 * 100) / 100;

/** "19.06%" → 19.06 */
export const parsePct = (s: string) => Number(String(s).replace("%", "").replace(",", "."));

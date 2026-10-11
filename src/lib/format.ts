export const money = (lang: string, n: number, currency = "COP") =>
  new Intl.NumberFormat(lang, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

/** Reemplaza {clave} en una cadena i18n. */
export const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

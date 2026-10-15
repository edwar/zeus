// Dinero. Dos detalles del idioma «es» que aquí se corrigen:
//  - Intl no agrupa los números de 4 cifras ("4000" pero "98.500", norma CLDR): se fuerza la agrupación.
//  - Con «es» la moneda sale como código ("98.500 COP"); en Colombia se escribe "$ 98.500", que es lo que da «es-CO».
// En inglés se deja el código ("COP 98,500"): un "$" suelto se leería como dólares.
export const money = (lang: string, n: number, currency = "COP", maxFractionDigits = 0) =>
  new Intl.NumberFormat(lang === "es" ? "es-CO" : lang, { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: maxFractionDigits, useGrouping: "always" }).format(n);

/** Número con separador de miles también en 4 cifras (conteos, kWh, tarifas). */
export const num = (lang: string, n: number, options: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat(lang, { useGrouping: "always", ...options }).format(n);

/** Reemplaza {clave} en una cadena i18n. */
export const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

/** «ana.perez@gmail.com» → «a***@gmail.com»: se reconoce el correo sin dejarlo completo a la vista. */
export const maskEmail = (email: string) => {
  const i = email.indexOf("@");
  return i < 1 ? "***" : `${email[0]}***${email.slice(i)}`;
};

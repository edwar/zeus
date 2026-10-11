import { locales } from "@/i18n/config";

/** Dominio público de producción. Se puede cambiar con NEXT_PUBLIC_SITE_URL sin tocar el código. */
export const PRODUCTION_URL = "https://zeus.cognilab.dev";

/**
 * URL base del sitio, sin barra final.
 * - NEXT_PUBLIC_SITE_URL manda si existe (producción en el dominio propio, o cualquier otro entorno).
 * - En producción de Vercel sin esa variable se usa el dominio de producción.
 * - En previews de Vercel, la URL del despliegue; en local, localhost.
 */
export const SITE_URL = (() => {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_ENV === "production") return PRODUCTION_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
})();

/** Solo el despliegue de producción se deja indexar; previews y local llevan noindex. */
export const INDEXABLE = process.env.VERCEL_ENV === "production" || process.env.NEXT_PUBLIC_SITE_INDEXABLE === "1";

export const absoluteUrl = (path = "") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Alternativas de idioma de una ruta (sin prefijo de idioma): para hreflang y canónica. */
export function languageAlternates(path: string, lang: string) {
  const clean = path === "/" ? "" : path;
  return {
    canonical: `/${lang}${clean}`,
    languages: { ...Object.fromEntries(locales.map((l) => [l, `/${l}${clean}`])), "x-default": `/es${clean}` },
  };
}

/** Next no combina `openGraph` entre layout y página (la página lo reemplaza entero): estos campos se repiten en cada una. */
export const ogBase = (lang: string, brand: string) => ({
  type: "website" as const,
  siteName: brand,
  locale: lang === "es" ? "es_CO" : "en_US",
  alternateLocale: lang === "es" ? ["en_US"] : ["es_CO"],
  // Tampoco se hereda la imagen del layout: se indica la de marca (la de un producto la reemplaza).
  images: [{ url: `/${lang}/opengraph-image`, width: 1200, height: 630, alt: brand }],
});

/** Igual para Twitter/X: imagen de marca por idioma. */
export const twitterImages = (lang: string) => [`/${lang}/opengraph-image`];

/** Serializa JSON-LD sin permitir que un texto cierre la etiqueta <script>. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

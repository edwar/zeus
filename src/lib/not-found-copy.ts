import { getDict } from "@/i18n";
import type { NotFoundCopy } from "@/components/NotFoundView";

/** Textos del 404 en los dos idiomas (solo lo mínimo viaja al cliente, no el diccionario completo). */
export const notFoundCopy = (): NotFoundCopy => {
  const es = getDict("es").notFound;
  const en = getDict("en").notFound;
  return { eyebrow: es.eyebrow, site: { es: es.site, en: en.site }, app: { es: es.app, en: en.app } };
};

import { portalUrl } from "@/lib/portal-link";
import { portalMessage, whatsappShareUrl } from "@/lib/quote-share";

/** Enlace del portal y el WhatsApp con el mensaje ya escrito (el envío es manual, sin costo). */
export function portalInfo(project: { id: string; portalVersion: number }, quote: { lang: string; contactName: string; contactPhone: string }) {
  const lang = quote.lang === "en" ? "en" : "es";
  const url = portalUrl(lang, project.id, project.portalVersion);
  return { url, whatsapp: whatsappShareUrl(quote.contactPhone, portalMessage({ name: quote.contactName, url, lang })) };
}

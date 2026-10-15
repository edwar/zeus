import { LEGAL } from "@/lib/legal/config";
import { esc, type MailLang } from "@/lib/mail";
import { unsubscribePostUrl, unsubscribeUrl } from "@/lib/unsubscribe";

/**
 * Pie común de todo correo al cliente: quién es el responsable de sus datos, a dónde escribir y cómo dejar de recibir
 * correos. Se agrega al enviar (no en cada plantilla), así ningún aviso nuevo puede salir sin él.
 */
export type ClientMessage = { subject: string; html: string; text: string };

export function clientFooter(to: string, lang: MailLang) {
  const c = LEGAL.controller;
  const es = lang === "es";
  const unsub = unsubscribeUrl(lang, to);
  const who = es
    ? `Responsable de tus datos: ${c.name} (${c.id}), ${c.address}, ${c.city}. Consultas y reclamos: ${c.privacyEmail}.`
    : `Data controller: ${c.name} (${c.id}), ${c.address}, ${c.city}. Questions and claims: ${c.privacyEmail}.`;
  const out = es
    ? "¿No quieres recibir más correos de Zeus? Responde a este correo o usa este enlace:"
    : "Don't want more emails from Zeus? Reply to this email or use this link:";
  const text = `\n--\n${who}\n${out} ${unsub}\n`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:32rem;margin:auto;padding:0 24px 24px;font-size:12px;line-height:1.5;color:#5b6f66;border-top:1px solid #d9e2dd">
<p style="margin:12px 0 4px">${esc(who)}</p><p style="margin:0">${esc(out)} <a href="${esc(unsub)}" style="color:#5b6f66">${esc(unsub)}</a></p></div>`;
  return { text, html, unsub };
}

/** Mensaje con el pie al final y los encabezados de baja (con ellos Gmail y Outlook muestran su propio botón «Cancelar suscripción»). */
export function withClientFooter(to: string, lang: MailLang, msg: ClientMessage) {
  const f = clientFooter(to, lang);
  return {
    ...msg,
    text: `${msg.text.replace(/\n+$/, "")}\n${f.text}`,
    html: `${msg.html}${f.html}`,
    headers: {
      "List-Unsubscribe": `<${unsubscribePostUrl(to)}>, <mailto:${LEGAL.controller.privacyEmail}?subject=${encodeURIComponent("Baja de correos")}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

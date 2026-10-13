/**
 * Envío de correo transaccional (restablecer contraseña, avisos internos y avisos al cliente) con la API de Resend.
 * Sin dependencias: un `fetch`. Si faltan RESEND_API_KEY o MAIL_FROM, `mailConfigured()` es false y no se envía nada.
 */
export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

export async function sendMail(msg: { to: string; subject: string; html: string; text: string }) {
  if (!mailConfigured()) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    // MAIL_REPLY_TO (opcional): que las respuestas de los clientes lleguen a una bandeja real, no al remitente automático.
    body: JSON.stringify({ from: process.env.MAIL_FROM, ...(process.env.MAIL_REPLY_TO && { reply_to: process.env.MAIL_REPLY_TO }), ...msg }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend respondió ${res.status}`);
  return true;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Correo de restablecimiento en el idioma de la página desde la que se pidió (es por defecto). */
export function resetPasswordEmail(opts: { name: string; url: string; lang: "es" | "en"; minutes: number }) {
  const es = opts.lang === "es";
  const subject = es ? "Restablece tu contraseña de Zeus" : "Reset your Zeus password";
  const intro = es ? `Hola ${opts.name}, pediste restablecer tu contraseña.` : `Hi ${opts.name}, you asked to reset your password.`;
  const action = es ? "Crear una contraseña nueva" : "Choose a new password";
  const note = es
    ? `El enlace vale ${opts.minutes} minutos y solo sirve una vez. Si no lo pediste, ignora este correo: tu contraseña no cambia.`
    : `The link is valid for ${opts.minutes} minutes and works once. If you didn't ask for it, ignore this email: your password stays the same.`;
  const text = `${intro}\n\n${action}: ${opts.url}\n\n${note}\n`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:32rem;margin:auto;padding:24px;color:#0b1f18">
<p style="font-size:16px">${esc(intro)}</p>
<p><a href="${esc(opts.url)}" style="display:inline-block;background:#ffc21a;color:#0b1f18;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px;border:2px solid #0b1f18">${esc(action)}</a></p>
<p style="font-size:14px;color:#3d544b">${esc(note)}</p></div>`;
  return { subject, text, html };
}

/** Aviso interno (en español) de que un cliente respondió a su cotización. El enlace lleva a la solicitud en el panel. */
export function quoteDecisionEmail(opts: { client: string; decision: "accepted" | "declined"; note?: string | null; url: string }) {
  const accepted = opts.decision === "accepted";
  const subject = accepted ? `${opts.client} aceptó la cotización` : `${opts.client} no aceptó la cotización`;
  const intro = accepted
    ? `${opts.client} aceptó la cotización desde su enlace. Falta tu aprobación: asigna el equipo (si hay instalación) y aprueba la solicitud.`
    : `${opts.client} respondió que no por ahora a la cotización.`;
  const note = opts.note ? `Comentario del cliente: ${opts.note}` : "";
  const action = "Abrir la solicitud";
  const text = [intro, note, `${action}: ${opts.url}`].filter(Boolean).join("\n\n") + "\n";
  const html = `<div style="font-family:system-ui,sans-serif;max-width:32rem;margin:auto;padding:24px;color:#0b1f18">
<p style="font-size:16px">${esc(intro)}</p>${note ? `<p style="font-size:14px;color:#3d544b">${esc(note)}</p>` : ""}
<p><a href="${esc(opts.url)}" style="display:inline-block;background:#ffc21a;color:#0b1f18;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px;border:2px solid #0b1f18">${action}</a></p></div>`;
  return { subject, text, html };
}

// ── Avisos al cliente (quien pidió la cotización) ────────────────────────────────────────────────

export type MailLang = "es" | "en";

/** Cuerpo común: saludo, párrafos, un botón opcional y el pie que explica por qué recibe el correo. */
function clientLayout(lang: MailLang, o: { name: string; paragraphs: string[]; action?: { label: string; url: string }; ref: string }) {
  const es = lang === "es";
  const hello = es ? `Hola ${o.name},` : `Hi ${o.name},`;
  const foot = es
    ? `Referencia ${o.ref}. Recibes este correo porque pediste una cotización en Zeus. Si tienes dudas, escríbele a tu asesor.`
    : `Reference ${o.ref}. You are receiving this email because you requested a quote from Zeus. If you have questions, write to your advisor.`;
  const text = [hello, ...o.paragraphs, ...(o.action ? [`${o.action.label}: ${o.action.url}`] : []), foot].join("\n\n") + "\n";
  const html = `<div style="font-family:system-ui,sans-serif;max-width:32rem;margin:auto;padding:24px;color:#0b1f18">
<p style="font-size:16px">${esc(hello)}</p>${o.paragraphs.map((p) => `<p style="font-size:16px">${esc(p)}</p>`).join("")}${
    o.action ? `<p><a href="${esc(o.action.url)}" style="display:inline-block;background:#ffc21a;color:#0b1f18;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px;border:2px solid #0b1f18">${esc(o.action.label)}</a></p>` : ""
  }<p style="font-size:13px;color:#3d544b">${esc(foot)}</p></div>`;
  return { text, html };
}

type ClientBase = { name: string; ref: string; lang: MailLang };

/** El asesor le manda el enlace de su cotización (la página con el PDF y el botón para aceptar). */
export function quoteLinkEmail(o: ClientBase & { url: string; validUntil: Date }) {
  const es = o.lang === "es";
  const until = new Intl.DateTimeFormat(o.lang, { dateStyle: "long" }).format(o.validUntil);
  const subject = es ? "Tu cotización de Zeus está lista" : "Your Zeus quote is ready";
  const body = clientLayout(o.lang, {
    name: o.name,
    ref: o.ref,
    paragraphs: es
      ? ["Preparamos tu cotización. Puedes revisarla, descargar el PDF y decirnos si quieres avanzar.", `El enlace vale hasta el ${until}.`]
      : ["We prepared your quote. You can review it, download the PDF and tell us if you want to move forward.", `The link is valid until ${until}.`],
    action: { label: es ? "Ver mi cotización" : "View my quote", url: o.url },
  });
  return { subject, ...body };
}

const portalAction = (lang: MailLang, url?: string) => (url ? { label: lang === "es" ? "Ver mi proyecto" : "View my project", url } : undefined);

/** La solicitud se aprobó. Con instalación sigue la visita técnica (y el portal para seguirla); solo kit, la entrega. */
export function quoteApprovedEmail(o: ClientBase & { kitOnly: boolean; portalUrl?: string }) {
  const es = o.lang === "es";
  const subject = es ? "Tu cotización de Zeus fue aprobada" : "Your Zeus quote was approved";
  const next = o.kitOnly
    ? es ? "Tu asesor te contactará para coordinar la entrega del kit." : "Your advisor will contact you to arrange the kit delivery."
    : es ? "El siguiente paso es la visita técnica: tu asesor te contactará para coordinarla." : "The next step is the technical visit: your advisor will contact you to schedule it.";
  const portal = o.portalUrl && !o.kitOnly ? [es ? "Desde tu página privada puedes seguir el avance de tu proyecto cuando quieras." : "From your private page you can follow your project's progress whenever you want."] : [];
  const body = clientLayout(o.lang, { name: o.name, ref: o.ref, paragraphs: [es ? "¡Gracias por confiar en nosotros! Tu cotización quedó aprobada." : "Thank you for trusting us! Your quote has been approved.", next, ...portal], action: o.kitOnly ? undefined : portalAction(o.lang, o.portalUrl) });
  return { subject, ...body };
}

/** El asesor le manda (o le reenvía) el enlace de su portal. */
export function portalLinkEmail(o: ClientBase & { url: string }) {
  const es = o.lang === "es";
  const subject = es ? "Sigue tu proyecto solar con Zeus" : "Follow your solar project with Zeus";
  const body = clientLayout(o.lang, {
    name: o.name,
    ref: o.ref,
    paragraphs: es
      ? ["Esta es tu página privada para ver cómo va tu proyecto: etapa, cronograma, materiales y tu cotización.", "Es solo para ti: no compartas el enlace."]
      : ["This is your private page to see how your project is going: stage, schedule, materials and your quote.", "It is just for you: please don't share the link."],
    action: { label: es ? "Ver mi proyecto" : "View my project", url: o.url },
  });
  return { subject, ...body };
}

export const NOTICE_STAGES = ["visit", "design", "install", "monitor"] as const;
export type NoticeStage = (typeof NOTICE_STAGES)[number];

const STAGE_COPY: Record<MailLang, Record<NoticeStage, { label: string; text: string }>> = {
  es: {
    visit: { label: "Visita técnica", text: "Nuestro equipo revisará tu sitio para confirmar el diseño de tu sistema." },
    design: { label: "Diseño de ingeniería", text: "Estamos dimensionando y documentando tu sistema." },
    install: { label: "Instalación", text: "Nuestro equipo está instalando tu sistema." },
    monitor: { label: "Monitoreo", text: "Tu sistema ya está instalado; ahora vigilamos que genere lo esperado." },
  },
  en: {
    visit: { label: "Technical visit", text: "Our team will inspect your site to confirm your system design." },
    design: { label: "Engineering design", text: "We are sizing and documenting your system." },
    install: { label: "Installation", text: "Our team is installing your system." },
    monitor: { label: "Monitoring", text: "Your system is installed; now we make sure it generates what is expected." },
  },
};

/** El proyecto pasó a una etapa nueva. */
export function projectStageEmail(o: ClientBase & { stage: NoticeStage; portalUrl?: string }) {
  const es = o.lang === "es";
  const c = STAGE_COPY[o.lang][o.stage];
  const subject = es ? `Tu proyecto solar avanzó: ${c.label}` : `Your solar project moved forward: ${c.label}`;
  const body = clientLayout(o.lang, { name: o.name, ref: o.ref, paragraphs: [es ? `Tu proyecto pasó a la etapa «${c.label}».` : `Your project moved to the “${c.label}” stage.`, c.text], action: portalAction(o.lang, o.portalUrl) });
  return { subject, ...body };
}

// ── Cálculo guardado del simulador ────────────────────────────────────────────────────────────────

/** Correo con el enlace para retomar el cálculo. Sin nombre ni referencia: quien lo guardó solo dejó su correo. */
export function simulationEmail(o: { lang: MailLang; url: string; validUntil: Date; kwp: number; monthlySavings: number | null; total: number; currency?: string }) {
  const es = o.lang === "es";
  const money = (n: number) => new Intl.NumberFormat(es ? "es-CO" : "en-US", { style: "currency", currency: o.currency ?? "COP", maximumFractionDigits: 0 }).format(n);
  const until = new Intl.DateTimeFormat(o.lang, { dateStyle: "long" }).format(o.validUntil);
  const subject = es ? "Tu cálculo solar de Zeus" : "Your Zeus solar calculation";
  const lines = es
    ? [`Sistema sugerido: ${o.kwp} kWp.`, ...(o.monthlySavings != null ? [`Ahorro mensual estimado: ${money(o.monthlySavings)}.`] : []), `Kit elegido: ${money(o.total)} (precio de referencia al momento de guardarlo).`]
    : [`Suggested system: ${o.kwp} kWp.`, ...(o.monthlySavings != null ? [`Estimated monthly savings: ${money(o.monthlySavings)}.`] : []), `Chosen kit: ${money(o.total)} (reference price when you saved it).`];
  const intro = es ? "Guardaste tu cálculo en el simulador de Zeus. Aquí tienes el resumen y el enlace para retomarlo cuando quieras." : "You saved your calculation in the Zeus simulator. Here is the summary and the link to pick it up whenever you want.";
  const note = es
    ? `El enlace vale hasta el ${until}. Los precios se actualizan al catálogo de ese día y son una estimación orientativa: tu cotización real la valida un asesor.`
    : `The link is valid until ${until}. Prices are refreshed to that day's catalog and are an orientative estimate: your real quote is validated by an advisor.`;
  const action = es ? "Retomar mi cálculo" : "Resume my calculation";
  const foot = es
    ? "Recibes este correo porque guardaste tu cálculo en Zeus y autorizaste que lo enviáramos a esta dirección. Un asesor podría escribirte para ayudarte con tu cotización."
    : "You are receiving this email because you saved your calculation on Zeus and authorized us to send it to this address. An advisor may write to you to help with your quote.";
  const hello = es ? "Hola," : "Hi,";
  const text = [hello, intro, ...lines, note, `${action}: ${o.url}`, foot].join("\n\n") + "\n";
  const html = `<div style="font-family:system-ui,sans-serif;max-width:32rem;margin:auto;padding:24px;color:#0b1f18">
<p style="font-size:16px">${esc(hello)}</p><p style="font-size:16px">${esc(intro)}</p>
<ul style="font-size:16px;padding-left:20px">${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
<p style="font-size:14px;color:#3d544b">${esc(note)}</p>
<p><a href="${esc(o.url)}" style="display:inline-block;background:#ffc21a;color:#0b1f18;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px;border:2px solid #0b1f18">${esc(action)}</a></p>
<p style="font-size:13px;color:#3d544b">${esc(foot)}</p></div>`;
  return { subject, text, html };
}

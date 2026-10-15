import { prisma } from "@/lib/prisma";
import { portalLinkEmail, projectStageEmail, quoteApprovedEmail, quoteLinkEmail, type MailLang, type NoticeStage } from "@/lib/mail";
import { portalUrl } from "@/lib/portal-link";
import type { NoticeKind, NoticeOutcome } from "@/lib/notice-core";
import { deliverToClient } from "@/lib/client-mail";
import { quoteRef } from "@/lib/quote-doc";

export type { NoticeKind, NoticeOutcome } from "@/lib/notice-core";

/**
 * Avisos por correo al cliente (quien pidió la cotización). Solo los dispara el equipo, ya autenticado: nunca el
 * formulario público, para que nadie pueda usar Zeus para escribirle a una dirección ajena.
 * Cada intento queda en el historial de la solicitud (QuoteEvent con subject "notice").
 */
type Quote = { id: string; contactName: string; contactEmail: string; lang: string; fulfillment: string };
type Built = { subject: string; html: string; text: string };

/**
 * Manda el aviso y lo registra. Con `once`, no repite un aviso que ya salió bien (los que fallaron se pueden reintentar).
 * Devuelve null si la solicitud no existe o el aviso ya se había enviado.
 */
export async function noticeClient(opts: { quoteId: string; kind: NoticeKind; by: string; once?: boolean; build: (q: Quote & { ref: string; mailLang: MailLang }) => Built }): Promise<NoticeOutcome | null> {
  const q = await prisma.quoteRequest.findUnique({ where: { id: opts.quoteId }, select: { id: true, contactName: true, contactEmail: true, lang: true, fulfillment: true } });
  if (!q) return null;
  if (opts.once) {
    const already = await prisma.quoteEvent.count({ where: { quoteId: q.id, subject: "notice", note: `${opts.kind}|sent` } });
    if (already) return null;
  }
  const mailLang: MailLang = q.lang === "en" ? "en" : "es";
  const outcome = await deliverToClient(q.contactEmail, mailLang, opts.build({ ...q, ref: quoteRef(q.id), mailLang }));
  // El estado del evento es el de la solicitud en ese momento; el aviso no lo cambia.
  const current = await prisma.quoteRequest.findUnique({ where: { id: q.id }, select: { status: true } });
  await prisma.quoteEvent.create({ data: { quoteId: q.id, toStatus: current?.status ?? "new", subject: "notice", note: `${opts.kind}|${outcome}`, userName: opts.by } });
  return outcome;
}

/** Enlace del portal de la cotización, si ya nació su proyecto (con solo kit no hay proyecto ni portal). */
export async function portalUrlForQuote(quoteId: string, lang: string): Promise<string | undefined> {
  const p = await prisma.project.findUnique({ where: { quoteId }, select: { id: true, portalVersion: true } });
  return p ? portalUrl(lang, p.id, p.portalVersion) : undefined;
}

export const noticeApproved = async (quoteId: string, by: string) => {
  const q = await prisma.quoteRequest.findUnique({ where: { id: quoteId }, select: { lang: true } });
  const url = await portalUrlForQuote(quoteId, q?.lang ?? "es");
  return noticeClient({ quoteId, kind: "approved", by, once: true, build: (c) => quoteApprovedEmail({ name: c.contactName, ref: c.ref, lang: c.mailLang, kitOnly: c.fulfillment === "kit_only", portalUrl: url }) });
};

export const noticeStage = async (quoteId: string, stage: NoticeStage, by: string) => {
  const q = await prisma.quoteRequest.findUnique({ where: { id: quoteId }, select: { lang: true } });
  const url = await portalUrlForQuote(quoteId, q?.lang ?? "es");
  return noticeClient({ quoteId, kind: `stage_${stage}`, by, once: true, build: (c) => projectStageEmail({ name: c.contactName, ref: c.ref, lang: c.mailLang, stage, portalUrl: url }) });
};

export const noticePortal = (quoteId: string, url: string, by: string) =>
  noticeClient({ quoteId, kind: "portal", by, build: (c) => portalLinkEmail({ name: c.contactName, ref: c.ref, lang: c.mailLang, url }) });

export const noticeLink = (quoteId: string, url: string, validUntil: Date, by: string) =>
  noticeClient({ quoteId, kind: "link", by, build: (q) => quoteLinkEmail({ name: q.contactName, ref: q.ref, lang: q.mailLang, url, validUntil }) });

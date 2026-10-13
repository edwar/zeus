import { createHash, randomBytes } from "node:crypto";

/** Días que vale el enlace público de una cotización. */
export const SHARE_TTL_DAYS = 15;

/** 32 bytes aleatorios en base64url: 43 caracteres. Imposible de adivinar. */
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
export const newShareToken = () => randomBytes(32).toString("base64url");
/** En la base solo se guarda el hash: quien lea la tabla no puede reconstruir los enlaces. */
export const hashShareToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const shareExpiry = (now = new Date()) => new Date(now.getTime() + SHARE_TTL_DAYS * 86_400_000);

export type ClientDecision = "accepted" | "declined";
/**
 * open     = el cliente puede responder
 * decided  = ya respondió (un enlace nuevo, que genera el asesor, reabre la respuesta)
 * expired  = pasó la vigencia
 * closed   = la solicitud ya no está en «cálculo confirmado» (aprobada, descartada o reabierta)
 */
export type ShareState = "open" | "decided" | "expired" | "closed";

export function shareState(q: { status: string; shareExpiresAt: Date | null; clientDecision: string | null }, now = new Date()): ShareState {
  if (q.status !== "confirmed") return "closed";
  if (!q.shareExpiresAt || q.shareExpiresAt.getTime() <= now.getTime()) return "expired";
  return q.clientDecision ? "decided" : "open";
}

/** Texto prellenado para que el asesor lo mande a mano por WhatsApp (sin API: no tiene costo). */
export function shareMessage(opts: { name: string; url: string; lang: "es" | "en" }) {
  return opts.lang === "es"
    ? `Hola ${opts.name}, te comparto tu cotización de Zeus. Puedes revisarla, descargar el PDF y decirnos si la aceptas aquí: ${opts.url}`
    : `Hi ${opts.name}, here is your Zeus quote. You can review it, download the PDF and tell us if you accept it here: ${opts.url}`;
}

export const whatsappShareUrl = (phone: string, message: string) => `https://wa.me/${phone.replace(/^\+/, "")}?text=${encodeURIComponent(message)}`;

/** Texto prellenado (envío manual por WhatsApp) con el enlace del portal del cliente. */
export function portalMessage(opts: { name: string; url: string; lang: "es" | "en" }) {
  return opts.lang === "es"
    ? `Hola ${opts.name}, esta es tu página privada para seguir el avance de tu proyecto solar con Zeus: ${opts.url}`
    : `Hi ${opts.name}, this is your private page to follow your solar project with Zeus: ${opts.url}`;
}

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { absoluteUrl } from "@/lib/site";
import { portalSecret } from "@/lib/portal-link";

/**
 * Baja de correos. El enlace lleva el correo y su firma (`{correo en base64url}.{HMAC}`): el servidor lo reconstruye cuando
 * arma cada correo, sin guardar tokens, y no vence (quien se quiere dar de baja no debe toparse con un enlace caducado).
 * Dar de baja solo cierra la puerta; nunca revela ni cambia otros datos.
 */
const SIG_RE = /^[A-Za-z0-9_-]{43}$/;
const BODY_RE = /^[A-Za-z0-9_-]{1,400}$/;

/** Mismo criterio que el resto de la plataforma: sin espacios y en minúsculas. */
export const normalizeEmail = (e: string) => e.trim().toLowerCase();

/** Lo que se guarda de un correo suprimido: nunca el correo en claro. */
export const emailHash = (email: string) => createHash("sha256").update(`suppress:${normalizeEmail(email)}`).digest("hex");

const sign = (email: string, secret = portalSecret()) => createHmac("sha256", secret).update(`unsubscribe:${normalizeEmail(email)}`).digest("base64url");

export const unsubscribeToken = (email: string, secret?: string) => `${Buffer.from(normalizeEmail(email)).toString("base64url")}.${sign(email, secret)}`;

/** Devuelve el correo si el token es auténtico; null si está mal formado o la firma no coincide. */
export function readUnsubscribeToken(token: string, secret?: string): string | null {
  const i = token.lastIndexOf(".");
  if (i < 1) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!BODY_RE.test(body) || !SIG_RE.test(sig)) return null;
  const email = Buffer.from(body, "base64url").toString("utf8");
  if (!email.includes("@")) return null;
  const expected = Buffer.from(sign(email, secret));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given) ? normalizeEmail(email) : null;
}

export const unsubscribePath = (lang: string, email: string) => `/${lang === "en" ? "en" : "es"}/unsubscribe/${unsubscribeToken(email)}`;
export const unsubscribeUrl = (lang: string, email: string) => absoluteUrl(unsubscribePath(lang, email));
/** Dirección del envío de un clic (RFC 8058): solo acepta POST. */
export const unsubscribePostUrl = (email: string) => absoluteUrl(`/api/unsubscribe/${unsubscribeToken(email)}`);

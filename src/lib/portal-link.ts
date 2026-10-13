import { createHmac, timingSafeEqual } from "node:crypto";
import { absoluteUrl } from "@/lib/site";

/**
 * Enlace del portal del cliente: `/{lang}/p/{proyecto}.{firma}`.
 * La firma es un HMAC del proyecto y de su versión, así que el servidor puede reconstruir el enlace cuando quiera
 * (para ponerlo en cada correo) sin guardar ningún token. Subir `portalVersion` invalida los enlaces anteriores.
 */
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const SIG_RE = /^[A-Za-z0-9_-]{43}$/;

export function portalSecret(): string {
  const s = process.env.PORTAL_SECRET || process.env.BETTER_AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("Falta PORTAL_SECRET o BETTER_AUTH_SECRET para firmar los enlaces del portal.");
  return "dev-portal-secret";
}

export const portalSig = (projectId: string, version: number, secret = portalSecret()) =>
  createHmac("sha256", secret).update(`portal:v${version}:${projectId}`).digest("base64url");

export const portalRef = (projectId: string, version: number, secret?: string) => `${projectId}.${portalSig(projectId, version, secret)}`;
export const portalPath = (lang: string, projectId: string, version: number) => `/${lang === "en" ? "en" : "es"}/p/${portalRef(projectId, version)}`;
export const portalUrl = (lang: string, projectId: string, version: number) => absoluteUrl(portalPath(lang, projectId, version));

/** Separa `proyecto.firma`; null si no tiene la forma esperada (así un valor raro ni siquiera llega a la base). */
export function parsePortalRef(ref: string): { id: string; sig: string } | null {
  const i = ref.lastIndexOf(".");
  if (i < 1) return null;
  const id = ref.slice(0, i);
  const sig = ref.slice(i + 1);
  return ID_RE.test(id) && SIG_RE.test(sig) ? { id, sig } : null;
}

/** ¿La firma corresponde a este proyecto y a esta versión? Comparación en tiempo constante. */
export function checkPortalSig(id: string, sig: string, version: number, secret?: string): boolean {
  const expected = Buffer.from(portalSig(id, version, secret));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

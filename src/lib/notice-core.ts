import { mailConfigured, sendMail, NOTICE_STAGES, type NoticeStage } from "@/lib/mail";

/** Parte de los avisos al cliente que no toca la base de datos (se prueba por separado). */
export type NoticeKind = "link" | "portal" | "approved" | `stage_${NoticeStage}`;
export type NoticeOutcome = "sent" | "failed" | "skipped";

export const NOTICE_KINDS: readonly NoticeKind[] = ["link", "portal", "approved", ...NOTICE_STAGES.map((s) => `stage_${s}` as const)];

/** Envía y devuelve qué pasó, sin lanzar nunca: un correo caído no debe romper el cambio que lo originó. */
export async function deliver(to: string, msg: { subject: string; html: string; text: string }): Promise<NoticeOutcome> {
  if (!mailConfigured()) return "skipped";
  try {
    return (await sendMail({ to, ...msg })) ? "sent" : "skipped";
  } catch (e) {
    console.error("client notice", e);
    return "failed";
  }
}

const ORDER = ["lead", "visit", "design", "install", "monitor"] as const;
/** ¿Pasar de `from` a `to` es avanzar? Mover una tarjeta hacia atrás (o corregir un error) nunca avisa al cliente. */
export const isForward = (from: string, to: string) => ORDER.indexOf(to as (typeof ORDER)[number]) > ORDER.indexOf(from as (typeof ORDER)[number]);
export const isNoticeStage = (s: string): s is NoticeStage => (NOTICE_STAGES as readonly string[]).includes(s);

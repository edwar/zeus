import { deliver, type NoticeOutcome } from "@/lib/notice-core";
import { withClientFooter, type ClientMessage } from "@/lib/client-footer";
import { isSuppressed } from "@/lib/suppression";
import type { MailLang } from "@/lib/mail";

/**
 * Único camino para escribirle a un cliente: respeta la baja (no envía y lo dice) y agrega el pie con el responsable de
 * los datos y el enlace para dejar de recibir correos. Los avisos al equipo y los de restablecer contraseña no pasan por aquí.
 */
export async function deliverToClient(to: string, lang: MailLang, msg: ClientMessage): Promise<NoticeOutcome> {
  if (await isSuppressed(to)) return "suppressed";
  return deliver(to, withClientFooter(to, lang, msg));
}

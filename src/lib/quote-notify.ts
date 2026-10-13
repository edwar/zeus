import { prisma } from "@/lib/prisma";
import { mailConfigured, quoteDecisionEmail, sendMail } from "@/lib/mail";
import { absoluteUrl } from "@/lib/site";

/** Avisa por correo a quienes atienden solicitudes (admin y gestión, sin cuentas bloqueadas). Sin correo configurado no hace nada. */
export async function notifyClientDecision(opts: { quoteId: string; clientName: string; decision: "accepted" | "declined"; note?: string }) {
  if (!mailConfigured()) return;
  const users = await prisma.user.findMany({ where: { role: { in: ["admin", "gestion"] }, NOT: { banned: true } }, select: { email: true } });
  const msg = quoteDecisionEmail({ client: opts.clientName, decision: opts.decision, note: opts.note, url: absoluteUrl(`/es/app/quotes/${opts.quoteId}`) });
  // Un envío por persona: nadie ve las direcciones de los demás.
  await Promise.allSettled(users.map((u) => sendMail({ to: u.email, ...msg })));
}

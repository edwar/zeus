import { prisma } from "@/lib/prisma";
import { emailHash } from "@/lib/unsubscribe";

/** ¿A este correo ya no se le escribe? (se dio de baja o se eliminaron sus datos) */
export async function isSuppressed(email: string): Promise<boolean> {
  return Boolean(await prisma.suppression.findUnique({ where: { emailHash: emailHash(email) }, select: { emailHash: true } }));
}

/** Registra la baja. Idempotente: si ya estaba, se conserva el motivo original. */
export async function suppressEmail(email: string, reason: "unsubscribe" | "staff" | "erased", by: string) {
  await prisma.suppression.upsert({ where: { emailHash: emailHash(email) }, create: { emailHash: emailHash(email), reason, createdBy: by }, update: {} });
}

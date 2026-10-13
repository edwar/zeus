import { prisma } from "@/lib/prisma";
import { bucketOf, todayBogota } from "@/lib/crm";
import type { Prisma } from "@/generated/prisma/client";

const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Una fecha de calendario (YYYY-MM-DD) como la guarda Postgres en una columna DATE. */
export const toDate = (s: string) => new Date(`${s}T00:00:00Z`);

/** Quién puede recibir recordatorios: quienes atienden solicitudes (admin y gestión), sin cuentas bloqueadas. */
export const staffWhere: Prisma.UserWhereInput = { role: { in: ["admin", "gestion"] }, NOT: { banned: true } };

/** Resuelve a quién se asigna: nadie indicado = quien lo crea; si indican a otra persona debe ser del equipo que atiende solicitudes. */
export async function resolveAssignee(requested: string | null | undefined, me: { userId: string; name: string }): Promise<{ id: string; name: string } | null> {
  if (!requested || requested === me.userId) return { id: me.userId, name: me.name };
  const u = await prisma.user.findFirst({ where: { id: requested, ...staffWhere }, select: { id: true, name: true } });
  return u;
}

const followUpSelect = {
  id: true, dueOn: true, note: true, assigneeId: true, assigneeName: true, doneAt: true, doneBy: true, createdBy: true, createdAt: true, quoteId: true, leadId: true,
  quote: { select: { id: true, contactName: true } },
  lead: { select: { id: true, name: true } },
} satisfies Prisma.FollowUpSelect;
export { followUpSelect };

export type FollowUpRow = Prisma.FollowUpGetPayload<{ select: typeof followUpSelect }>;

export function toFollowUpDto(f: FollowUpRow, today = todayBogota()) {
  const dueOn = iso(f.dueOn);
  const target = f.quote ? { kind: "quote" as const, id: f.quote.id, name: f.quote.contactName } : { kind: "lead" as const, id: f.lead!.id, name: f.lead!.name };
  return {
    id: f.id,
    dueOn,
    bucket: f.doneAt ? null : bucketOf(dueOn, today),
    note: f.note,
    assigneeId: f.assigneeId,
    assigneeName: f.assigneeName,
    doneAt: f.doneAt?.toISOString() ?? null,
    doneBy: f.doneBy,
    createdBy: f.createdBy,
    target,
  };
}

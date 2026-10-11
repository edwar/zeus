import { installFee } from "@/lib/install-fee";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Crea el proyecto de una solicitud aprobada: cliente, ciudad, potencia y materiales salen de la solicitud.
 * Es idempotente (quoteId único): si ya existe, no hace nada. Se llama dentro de la transacción de la aprobación.
 */
export async function createProjectFromQuote(tx: Prisma.TransactionClient, quoteId: string, owner: string): Promise<string | null> {
  const existing = await tx.project.findUnique({ where: { quoteId }, select: { id: true } });
  if (existing) return existing.id;
  const q = await tx.quoteRequest.findUnique({ where: { id: quoteId }, include: { items: true, team: { select: { installBase: true, installPerKwp: true } } } });
  if (!q) return null;
  const sizing = q.sizing as { kwp?: number };
  const bill = q.bill as { municipality?: string | null; department?: string | null };
  const kwp = Math.round((sizing.kwp ?? 0) * 100) / 100;
  const due = new Date();
  due.setDate(due.getDate() + 30);
  const town = q.city || bill.municipality || bill.department || "—";
  const project = await tx.project.create({
    data: {
      id: `q-${quoteId.slice(-8)}`,
      quoteId,
      name: `Sistema ${kwp} kWp · ${town}`,
      client: q.contactName,
      town,
      kwp,
      stage: "visit",
      teamId: q.teamId,
      installFee: q.team ? installFee({ installBase: q.team.installBase == null ? null : Number(q.team.installBase), installPerKwp: q.team.installPerKwp == null ? null : Number(q.team.installPerKwp) }, kwp) : null,
      owner,
      due,
      progress: 0,
      materials: { create: q.items.map((i) => ({ id: `${quoteId.slice(-8)}-${i.id.slice(-8)}`, nameEs: i.nameSnapshot, nameEn: i.nameSnapshot, qty: i.qty })) },
    },
    select: { id: true },
  });
  return project.id;
}

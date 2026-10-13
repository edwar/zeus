import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { LEAD_STATUSES, leadBody, normEmail } from "@/lib/crm";
import { toDate } from "@/lib/crm-server";

const listQuery = z.object({ status: z.enum(LEAD_STATUSES).optional() });

/** Contactos manuales (aún sin cotización), con la fecha de su próximo recordatorio. */
export async function GET(req: NextRequest) {
  const a = await authorize(req, "quotes");
  if (a.denied) return a.denied;
  const parsed = listQuery.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return Response.json({ error: "invalid_query" }, { status: 400 });
  const { status } = parsed.data;
  const [rows, grouped] = await Promise.all([
    prisma.lead.findMany({
      where: status ? { status } : {},
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 200,
      include: { followUps: { where: { doneAt: null }, orderBy: { dueOn: "asc" }, take: 1, select: { dueOn: true } } },
    }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<(typeof LEAD_STATUSES)[number], number>;
  for (const g of grouped) counts[g.status as keyof typeof counts] = g._count._all;
  return Response.json({
    items: rows.map((l) => ({
      id: l.id, name: l.name, phone: l.phone, email: l.email, city: l.city, source: l.source, status: l.status,
      createdAt: l.createdAt.toISOString(), createdBy: l.createdBy, quoteId: l.quoteId,
      nextFollowUp: l.followUps[0]?.dueOn.toISOString().slice(0, 10) ?? null,
    })),
    counts: { all: counts.open + counts.converted + counts.lost, ...counts },
  });
}

/** Registra un contacto. Si ya existe alguien con ese teléfono o correo, no lo duplica: avisa de quién es. */
export async function POST(req: NextRequest) {
  const big = tooLarge(req, 10_000);
  if (big) return big;
  const a = await authorize(req, "quotes");
  if (a.denied) return a.denied;
  const parsed = leadBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const b = parsed.data;
  const email = normEmail(b.email);

  const sameContact = [{ phone: b.phone }, ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : [])];
  const [lead, quote] = await Promise.all([
    prisma.lead.findFirst({ where: { status: { not: "lost" }, OR: sameContact }, select: { id: true, name: true } }),
    prisma.quoteRequest.findFirst({ where: { OR: [{ contactPhone: b.phone }, ...(email ? [{ contactEmail: { equals: email, mode: "insensitive" as const } }] : [])] }, orderBy: { createdAt: "desc" }, select: { id: true, contactName: true } }),
  ]);
  if (lead || quote) {
    const of = lead ? { kind: "lead", id: lead.id, name: lead.name } : { kind: "quote", id: quote!.id, name: quote!.contactName };
    return Response.json({ error: "duplicate", of }, { status: 409 });
  }

  const me = { userId: a.userId, name: a.name };
  const created = await prisma.lead.create({
    data: {
      name: b.name, phone: b.phone, email, city: b.city, source: b.source, consentAt: new Date(), createdBy: a.name,
      ...(b.note && { notes: { create: { body: b.note, userName: a.name } } }),
      ...(b.followUpOn && { followUps: { create: { dueOn: toDate(b.followUpOn), note: "Dar seguimiento", assigneeId: me.userId, assigneeName: me.name, createdBy: a.name } } }),
    },
    select: { id: true },
  });
  return Response.json({ id: created.id }, { status: 201 });
}

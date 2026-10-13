import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { leadPatch, normEmail } from "@/lib/crm";
import { followUpSelect, toFollowUpDto } from "@/lib/crm-server";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/leads/[id]">) {
  const a = await authorize(req, "quotes");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const l = await prisma.lead.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      followUps: { orderBy: [{ doneAt: { sort: "asc", nulls: "first" } }, { dueOn: "asc" }], select: followUpSelect },
    },
  });
  if (!l) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({
    id: l.id, name: l.name, phone: l.phone, email: l.email, city: l.city, source: l.source, status: l.status, lostReason: l.lostReason,
    createdAt: l.createdAt.toISOString(), createdBy: l.createdBy, consentAt: l.consentAt.toISOString(), quoteId: l.quoteId,
    notes: l.notes.map((n) => ({ id: n.id, body: n.body, by: n.userName, at: n.createdAt.toISOString() })),
    followUps: l.followUps.map((f) => toFollowUpDto(f)),
  });
}

/** Edita los datos, o marca el contacto como perdido (con motivo) / lo reabre. «Pasó a cotización» lo pone el sistema solo. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/leads/[id]">) {
  const big = tooLarge(req, 5_000);
  if (big) return big;
  const a = await authorize(req, "quotes");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const parsed = leadPatch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const b = parsed.data;
  const current = await prisma.lead.findUnique({ where: { id }, select: { status: true } });
  if (!current) return Response.json({ error: "not_found" }, { status: 404 });
  if (current.status === "converted" && b.status) return Response.json({ error: "converted" }, { status: 409 });
  if (b.status === "lost" && !b.lostReason) return Response.json({ error: "reason_required" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id },
      data: {
        ...(b.name !== undefined && { name: b.name }),
        ...(b.phone !== undefined && { phone: b.phone }),
        ...(b.email !== undefined && { email: normEmail(b.email) }),
        ...(b.city !== undefined && { city: b.city }),
        ...(b.source !== undefined && { source: b.source }),
        ...(b.status === "lost" && { status: "lost", lostReason: b.lostReason }),
        ...(b.status === "open" && { status: "open", lostReason: null }),
      },
    });
    // Perder un contacto cierra sus recordatorios: ya no hay nada que seguir.
    if (b.status === "lost") await tx.followUp.updateMany({ where: { leadId: id, doneAt: null }, data: { doneAt: new Date(), doneBy: a.name } });
    if (b.status) await tx.leadNote.create({ data: { leadId: id, userName: a.name, body: b.status === "lost" ? `Marcado como perdido: ${b.lostReason}` : "Reabierto" } });
  });
  return Response.json({ id });
}

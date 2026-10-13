import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { guardApi } from "@/lib/session";
import { installFee } from "@/lib/install-fee";
import { createProjectFromQuote } from "@/lib/quote-project";
import { QUOTE_STATUSES, canMove, needsNote } from "@/lib/quote-flow";
import { noticeApproved } from "@/lib/client-notices";
import { followUpSelect, toFollowUpDto } from "@/lib/crm-server";

const num = (d: { toString(): string } | null) => (d == null ? null : Number(d));

export async function GET(req: NextRequest, ctx: RouteContext<"/api/quotes/[id]">) {
  const denied = await guardApi(req, { perm: "quotes" });
  if (denied) return denied;
  const { id } = await ctx.params;
  const q = await prisma.quoteRequest.findUnique({ where: { id }, include: { lead: { select: { id: true, name: true } }, followUps: { orderBy: [{ doneAt: { sort: "asc", nulls: "first" } }, { dueOn: "asc" }], select: followUpSelect }, project: { select: { id: true, installFee: true } }, team: { select: { id: true, name: true, installBase: true, installPerKwp: true } }, items: { orderBy: { kind: "asc" } }, events: { orderBy: { createdAt: "desc" } } } });
  if (!q) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({
    id: q.id,
    status: q.status,
    lang: q.lang,
    source: q.source,
    lead: q.lead,
    followUps: q.followUps.map((f) => toFollowUpDto(f)),
    contactName: q.contactName,
    contactEmail: q.contactEmail,
    contactPhone: q.contactPhone,
    city: q.city,
    systemType: q.systemType,
    bill: q.bill,
    sizing: q.sizing,
    total: Number(q.total),
    currency: q.currency,
    createdAt: q.createdAt.toISOString(),
    discardReason: q.discardReason,
    projectId: q.project?.id ?? null,
    fulfillment: q.fulfillment,
    installerChoice: q.installerChoice,
    financing: q.financing,
    share: { expiresAt: q.shareExpiresAt?.toISOString() ?? null, decision: q.clientDecision, decidedAt: q.clientDecidedAt?.toISOString() ?? null, note: q.clientDecisionNote },
    team: q.team && { id: q.team.id, name: q.team.name },
    // Con proyecto, el valor es el congelado al aprobar; antes, la estimación con la tarifa vigente del equipo
    installFee: q.project?.installFee != null ? Number(q.project.installFee) : q.team ? installFee({ installBase: num(q.team.installBase), installPerKwp: num(q.team.installPerKwp) }, (q.sizing as { kwp?: number }).kwp ?? 0) : null,
    distanceKm: q.distanceKm,
    originalTotal: q.originalTotal == null ? null : Number(q.originalTotal),
    events: q.events.map((e) => ({ id: e.id, kitChange: e.kitChange, subject: e.subject, from: e.fromStatus, to: e.toStatus, note: e.note, by: e.userName, at: e.createdAt.toISOString() })),
    items: q.items.map((i) => ({ id: i.id, productId: i.productId, kind: i.kind, name: i.nameSnapshot, unitPrice: Number(i.unitPrice), qty: i.qty })),
  });
}

const patchBody = z.object({ status: z.enum(QUOTE_STATUSES), note: z.string().trim().max(500).optional() });

/** Cambia el estado siguiendo el flujo; cada cambio queda en el historial con quién lo hizo. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/quotes/[id]">) {
  const denied = await guardApi(req, { perm: "quotes" });
  if (denied) return denied;
  const session = await auth.api.getSession({ headers: req.headers });
  const { id } = await ctx.params;
  const parsed = patchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const { status: to, note } = parsed.data;
  if (needsNote(to) && !note) return Response.json({ error: "note_required" }, { status: 400 });

  const current = await prisma.quoteRequest.findUnique({ where: { id }, select: { status: true, fulfillment: true, teamId: true } });
  if (!current) return Response.json({ error: "not_found" }, { status: 404 });
  if (!canMove(current.status, to)) return Response.json({ error: "invalid_transition" }, { status: 409 });
  // Aprobar con instalación de Zeus exige un equipo asignado: de ahí sale el proyecto.
  if (to === "approved" && current.fulfillment !== "kit_only" && !current.teamId) return Response.json({ error: "team_required" }, { status: 409 });

  // updateMany con el estado esperado: si dos personas lo cambian a la vez, solo una gana.
  const done = await prisma.$transaction(async (tx) => {
    const r = await tx.quoteRequest.updateMany({
      where: { id, status: current.status },
      data: { status: to, discardReason: to === "discarded" ? note : to === "contacted" ? null : undefined },
    });
    if (r.count === 0) return false;
    await tx.quoteEvent.create({ data: { quoteId: id, fromStatus: current.status, toStatus: to, note: note || null, userName: session?.user.name ?? "—" } });
    // Aprobar = el cliente aceptó: nace el proyecto en la misma transacción.
    // Solo se crea proyecto si hay instalación: fuera de la zona (kit_only) la solicitud termina como venta del kit.
    if (to === "approved" && current.fulfillment !== "kit_only") await createProjectFromQuote(tx, id, session?.user.name ?? "—");
    return true;
  });
  if (!done) return Response.json({ error: "conflict" }, { status: 409 });
  // Aviso al cliente, ya con el cambio guardado: si el correo falla, la aprobación sigue en pie (queda anotado en el historial).
  if (to === "approved") await noticeApproved(id, session?.user.name ?? "—").catch((e) => console.error("notice approved", e));
  return Response.json({ id, status: to });
}

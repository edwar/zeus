import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { stageValues, toProjectDto } from "@/lib/projects";
import { authorize, guardApi, projectScope } from "@/lib/session";
import type { Stage } from "@/generated/prisma/client";

/** Detalle del proyecto con cronograma, materiales y alertas. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/projects/[id]">) {
  const a = await authorize(req, "projects.view");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const p = await prisma.project.findFirst({
    where: { id, ...projectScope(a.role, a.userId) },
    include: { team: { select: { id: true, name: true, contactName: true, phone: true, city: true, members: { select: { user: { select: { name: true } } } } } }, milestones: { orderBy: { startDate: "asc" } }, materials: { orderBy: { nameEs: "asc" } }, alerts: { orderBy: { occurredAt: "desc" } } },
  });
  if (!p) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({
    ...toProjectDto(p),
    // El equipo operativo no ve la solicitud del cliente ni lo que cobra: solo lo que necesita para instalar.
    quoteId: a.role === "equipo" ? null : p.quoteId,
    teamDetail: p.team && { id: p.team.id, name: p.team.name, contactName: p.team.contactName, phone: p.team.phone, city: p.team.city, members: p.team.members.map((m) => m.user.name) },
    installFee: a.role === "equipo" || p.installFee == null ? null : Number(p.installFee),
    milestones: p.milestones.map((m) => ({ id: m.id, label: m.labelEs, startDate: m.startDate.toISOString().slice(0, 10), len: m.len, crew: m.crew, done: m.done })),
    materials: p.materials.map((m) => ({ id: m.id, name: m.nameEs, qty: m.qty, ready: m.ready })),
    monitorUrl: p.monitorUrl,
    monitorNote: p.monitorNote,
    alerts: p.alerts.map((a) => ({ id: a.id, severity: a.severity, message: a.messageEs, at: a.occurredAt.toISOString(), by: a.createdBy, resolvedAt: a.resolvedAt?.toISOString() ?? null, resolvedBy: a.resolvedBy })),
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/projects/[id]">) {
  const denied = await guardApi(req, { perm: "projects.manage" });
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { stage?: unknown } | null;
  const stage = body?.stage;
  if (typeof stage !== "string" || !(stageValues as readonly string[]).includes(stage)) {
    return Response.json({ error: "Invalid stage" }, { status: 400 });
  }
  try {
    const project = await prisma.project.update({ where: { id }, data: { stage: stage as Stage } });
    return Response.json(toProjectDto(project));
  } catch {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }
}

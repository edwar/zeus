import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/roles";
import { stageValues, toProjectDto } from "@/lib/projects";
import { authorize, projectScope } from "@/lib/session";
import { noticeStage } from "@/lib/client-notices";
import { portalInfo } from "@/lib/portal-info";
import { isForward, isNoticeStage } from "@/lib/notice-core";
import type { NoticeStage } from "@/lib/mail";
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
  // Enlace del portal del cliente (solo gestión; se reconstruye, no se guarda) y el mensaje de WhatsApp para enviarlo a mano.
  const q = a.role !== "equipo" && p.quoteId ? await prisma.quoteRequest.findUnique({ where: { id: p.quoteId }, select: { lang: true, contactName: true, contactPhone: true } }) : null;
  const portal = q ? portalInfo(p, q) : null;
  // Solo quien maneja el inventario ve de dónde sale cada material y cuánto hay (el equipo de instalación no).
  const tracked = can(a.role, "stock") ? new Map((await prisma.stockItem.findMany({ where: { productId: { in: p.materials.map((m) => m.productId).filter((x): x is string => !!x) } }, select: { productId: true, onHand: true } })).map((s) => [s.productId, s.onHand])) : null;
  return Response.json({
    ...toProjectDto(p),
    portal,
    // El equipo operativo no ve la solicitud del cliente ni lo que cobra: solo lo que necesita para instalar.
    quoteId: a.role === "equipo" ? null : p.quoteId,
    teamDetail: p.team && { id: p.team.id, name: p.team.name, contactName: p.team.contactName, phone: p.team.phone, city: p.team.city, members: p.team.members.map((m) => m.user.name) },
    installFee: a.role === "equipo" || p.installFee == null ? null : Number(p.installFee),
    milestones: p.milestones.map((m) => ({ id: m.id, label: m.labelEs, startDate: m.startDate.toISOString().slice(0, 10), len: m.len, crew: m.crew, done: m.done })),
    materials: p.materials.map((m) => ({ id: m.id, name: m.nameEs, qty: m.qty, ready: m.ready, ...(tracked && { source: m.source as "stock" | "supplier", onHand: m.productId && tracked.has(m.productId) ? tracked.get(m.productId)! : null }) })),
    // Solo gestión: el equipo operativo no ve nada de lo que se le avisa al cliente.
    notifyClient: a.role === "equipo" || !p.quoteId ? null : p.notifyClient,
    monitorUrl: p.monitorUrl,
    monitorNote: p.monitorNote,
    alerts: p.alerts.map((a) => ({ id: a.id, severity: a.severity, message: a.messageEs, at: a.occurredAt.toISOString(), by: a.createdBy, resolvedAt: a.resolvedAt?.toISOString() ?? null, resolvedBy: a.resolvedBy })),
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/projects/[id]">) {
  const a = await authorize(req, "projects.manage");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { stage?: unknown; notifyClient?: unknown } | null;
  const { stage, notifyClient } = body ?? {};
  const stageOk = typeof stage === "string" && (stageValues as readonly string[]).includes(stage);
  const notifyOk = typeof notifyClient === "boolean";
  if (!(stageOk || notifyOk) || (stage !== undefined && !stageOk) || (notifyClient !== undefined && !notifyOk)) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const current = await prisma.project.findUnique({ where: { id }, select: { stage: true, quoteId: true, notifyClient: true } });
  if (!current) return Response.json({ error: "Project not found" }, { status: 404 });

  // El estado esperado en el `where` hace que, si dos personas lo mueven a la vez, solo una gane (y solo una avise).
  const r = await prisma.project.updateMany({
    where: { id, ...(stageOk && { stage: current.stage }) },
    data: { ...(stageOk && { stage: stage as Stage }), ...(notifyOk && { notifyClient: notifyClient as boolean }) },
  });
  if (r.count === 0) return Response.json({ error: "conflict" }, { status: 409 });

  // Avanzar de etapa avisa al cliente (si el proyecto nació de una cotización y el aviso está activo). Retroceder, nunca.
  // Si se cambia el interruptor y la etapa a la vez, manda el valor nuevo.
  const wantsNotice = notifyOk ? (notifyClient as boolean) : current.notifyClient;
  if (stageOk && current.quoteId && wantsNotice && isForward(current.stage, stage as string) && isNoticeStage(stage as string)) {
    await noticeStage(current.quoteId, stage as NoticeStage, a.name).catch((e) => console.error("notice stage", e));
  }
  const project = await prisma.project.findUnique({ where: { id } });
  return Response.json(toProjectDto(project!));
}

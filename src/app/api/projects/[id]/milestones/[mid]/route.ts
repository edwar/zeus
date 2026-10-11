import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, guardApi, projectVisible } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { milestoneBody } from "@/lib/projects";

type Ctx = { params: Promise<{ id: string; mid: string }> };

/** Edita un hito (avance, fechas, cuadrilla). Solo cambia lo que llega. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const big = tooLarge(req, 5_000);
  if (big) return big;
  const { id, mid } = await ctx.params;
  const parsed = milestoneBody.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const b = parsed.data;
  // Cambiar solo el avance lo puede hacer también el equipo de ese proyecto; nombre, fechas o cuadrilla, solo gestión.
  const onlyProgress = Object.keys(b).every((k) => k === "done");
  const a = await authorize(req, onlyProgress ? "projects.progress" : "projects.manage");
  if (a.denied) return a.denied;
  if (!(await projectVisible(a, id))) return Response.json({ error: "not_found" }, { status: 404 });
  const r = await prisma.milestone.updateMany({
    where: { id: mid, projectId: id },
    data: { ...(b.label && { labelEs: b.label, labelEn: b.label }), ...(b.startDate && { startDate: new Date(b.startDate) }), ...(b.len && { len: b.len }), ...(b.crew && { crew: b.crew }), ...(b.done !== undefined && { done: b.done }) },
  });
  return r.count ? Response.json({ id: mid }) : Response.json({ error: "not_found" }, { status: 404 });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const denied = await guardApi(req, { perm: "projects.manage" });
  if (denied) return denied;
  const { id, mid } = await ctx.params;
  const r = await prisma.milestone.deleteMany({ where: { id: mid, projectId: id } });
  return r.count ? new Response(null, { status: 204 }) : Response.json({ error: "not_found" }, { status: 404 });
}

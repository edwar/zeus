import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { teamBody } from "@/lib/teams";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const denied = await guardApi(req, { perm: "teams.view" });
  if (denied) return denied;
  const { id } = await ctx.params;
  const t = await prisma.team.findUnique({
    where: { id },
    include: { projects: { select: { id: true, name: true, stage: true, town: true }, orderBy: { createdAt: "desc" }, take: 50 }, members: { select: { user: { select: { id: true, name: true, email: true } } } } },
  });
  if (!t) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ ...t, installBase: t.installBase == null ? null : Number(t.installBase), installPerKwp: t.installPerKwp == null ? null : Number(t.installPerKwp), members: t.members.map((m) => m.user), createdAt: undefined, updatedAt: undefined });
}

export async function PUT(req: Request, ctx: Ctx) {
  const denied = await guardApi(req, { perm: "teams.edit" });
  if (denied) return denied;
  const big = tooLarge(req, 10_000);
  if (big) return big;
  const { id } = await ctx.params;
  const parsed = teamBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const { memberIds, ...data } = parsed.data;
  try {
    const found = await prisma.$transaction(async (tx) => {
      const r = await tx.team.updateMany({ where: { id }, data });
      if (r.count === 0) return false;
      await tx.teamMember.deleteMany({ where: { teamId: id } });
      await tx.teamMember.createMany({ data: [...new Set(memberIds)].map((userId) => ({ teamId: id, userId })) });
      return true;
    });
    return found ? Response.json({ id }) : Response.json({ error: "not_found" }, { status: 404 });
  } catch {
    return Response.json({ error: "unknown_user" }, { status: 400 });
  }
}

/** Solo se borra un equipo sin historial; si ya tuvo proyectos o solicitudes se desactiva en su lugar. */
export async function DELETE(req: Request, ctx: Ctx) {
  const denied = await guardApi(req, { perm: "teams.delete" });
  if (denied) return denied;
  const { id } = await ctx.params;
  const [projects, quotes] = await Promise.all([prisma.project.count({ where: { teamId: id } }), prisma.quoteRequest.count({ where: { teamId: id } })]);
  if (projects + quotes > 0) return Response.json({ error: "in_use" }, { status: 409 });
  const r = await prisma.team.deleteMany({ where: { id } });
  return r.count ? new Response(null, { status: 204 }) : Response.json({ error: "not_found" }, { status: 404 });
}

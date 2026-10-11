import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { teamBody } from "@/lib/teams";

export async function GET(req: Request) {
  const denied = await guardApi(req, { perm: "teams.view" });
  if (denied) return denied;
  const [teams, load] = await Promise.all([
    prisma.team.findMany({ orderBy: [{ active: "desc" }, { city: "asc" }, { name: "asc" }], include: { _count: { select: { members: true } } } }),
    prisma.project.groupBy({ by: ["teamId"], where: { teamId: { not: null }, stage: { in: ["lead", "visit", "design", "install"] } }, _count: { _all: true } }),
  ]);
  const byTeam = new Map(load.map((l) => [l.teamId, l._count._all]));
  return Response.json(teams.map(({ _count, ...t }) => ({ ...t, installBase: t.installBase == null ? null : Number(t.installBase), installPerKwp: t.installPerKwp == null ? null : Number(t.installPerKwp), createdAt: undefined, updatedAt: undefined, load: byTeam.get(t.id) ?? 0, memberCount: _count.members })));
}

export async function POST(req: Request) {
  const denied = await guardApi(req, { perm: "teams.edit" });
  if (denied) return denied;
  const big = tooLarge(req, 10_000);
  if (big) return big;
  const parsed = teamBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const { memberIds, ...data } = parsed.data;
  try {
    const t = await prisma.team.create({ data: { ...data, members: { create: [...new Set(memberIds)].map((userId) => ({ userId })) } } });
    return Response.json({ id: t.id }, { status: 201 });
  } catch {
    return Response.json({ error: "unknown_user" }, { status: 400 }); // algún integrante ya no existe
  }
}

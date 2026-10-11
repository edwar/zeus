import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { milestoneBody } from "@/lib/projects";

/** Agrega un hito al cronograma del proyecto. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApi(req, { perm: "projects.manage" });
  if (denied) return denied;
  const big = tooLarge(req, 5_000);
  if (big) return big;
  const { id } = await ctx.params;
  const parsed = milestoneBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const b = parsed.data;
  if (!(await prisma.project.findUnique({ where: { id }, select: { id: true } }))) return Response.json({ error: "not_found" }, { status: 404 });
  if ((await prisma.milestone.count({ where: { projectId: id } })) >= 100) return Response.json({ error: "too_many" }, { status: 409 });
  const m = await prisma.milestone.create({ data: { projectId: id, labelEs: b.label, labelEn: b.label, startDate: new Date(b.startDate), len: b.len, crew: b.crew, done: b.done ?? 0 } });
  return Response.json({ id: m.id }, { status: 201 });
}

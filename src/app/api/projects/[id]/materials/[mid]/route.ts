import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorize, projectVisible } from "@/lib/session";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; mid: string }> }) {
  const a = await authorize(req, "projects.progress");
  if (a.denied) return a.denied;
  const { id, mid } = await ctx.params;
  if (!(await projectVisible(a, id))) return Response.json({ error: "not_found" }, { status: 404 });
  const parsed = z.object({ ready: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const r = await prisma.material.updateMany({ where: { id: mid, projectId: id }, data: { ready: parsed.data.ready } });
  return r.count ? Response.json({ id: mid }) : Response.json({ error: "not_found" }, { status: 404 });
}

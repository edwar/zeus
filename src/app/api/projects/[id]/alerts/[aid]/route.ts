import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { authorize, guardApi, projectVisible } from "@/lib/session";

type Ctx = { params: Promise<{ id: string; aid: string }> };

/** Marca la alerta como atendida (o la reabre). */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const a0 = await authorize(req, "projects.progress");
  if (a0.denied) return a0.denied;
  const session = await auth.api.getSession({ headers: req.headers });
  const { id, aid } = await ctx.params;
  if (!(await projectVisible(a0, id))) return Response.json({ error: "not_found" }, { status: 404 });
  const parsed = z.object({ resolved: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const r = await prisma.alert.updateMany({
    where: { id: aid, projectId: id },
    data: parsed.data.resolved ? { resolvedAt: new Date(), resolvedBy: session?.user.name ?? "—" } : { resolvedAt: null, resolvedBy: null },
  });
  return r.count ? Response.json({ id: aid }) : Response.json({ error: "not_found" }, { status: 404 });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const denied = await guardApi(req, { perm: "projects.manage" });
  if (denied) return denied;
  const { id, aid } = await ctx.params;
  const r = await prisma.alert.deleteMany({ where: { id: aid, projectId: id } });
  return r.count ? new Response(null, { status: 204 }) : Response.json({ error: "not_found" }, { status: 404 });
}

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { authorize, projectVisible } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { alertBody } from "@/lib/projects";

/** Registra una alerta de monitoreo del proyecto (falla, producción baja, cliente que reporta un problema…). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const a0 = await authorize(req, "projects.progress");
  if (a0.denied) return a0.denied;
  const big = tooLarge(req, 2_000);
  if (big) return big;
  const session = await auth.api.getSession({ headers: req.headers });
  const { id } = await ctx.params;
  if (!(await projectVisible(a0, id))) return Response.json({ error: "not_found" }, { status: 404 });
  const parsed = alertBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  if (!(await prisma.project.findUnique({ where: { id }, select: { id: true } }))) return Response.json({ error: "not_found" }, { status: 404 });
  if ((await prisma.alert.count({ where: { projectId: id } })) >= 500) return Response.json({ error: "too_many" }, { status: 409 });
  const a = await prisma.alert.create({ data: { projectId: id, severity: parsed.data.severity, messageEs: parsed.data.message, messageEn: parsed.data.message, createdBy: session?.user.name ?? "—" } });
  return Response.json({ id: a.id }, { status: 201 });
}

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { monitoringBody } from "@/lib/projects";

/** Guarda el enlace a la app o nube del inversor donde se ve el sistema (solo https) y una nota con usuario o id de planta. */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApi(req, { perm: "projects.manage" });
  if (denied) return denied;
  const big = tooLarge(req, 2_000);
  if (big) return big;
  const { id } = await ctx.params;
  const parsed = monitoringBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_url" }, { status: 400 });
  const r = await prisma.project.updateMany({ where: { id }, data: { monitorUrl: parsed.data.url, monitorNote: parsed.data.note } });
  return r.count ? Response.json({ id }) : Response.json({ error: "not_found" }, { status: 404 });
}

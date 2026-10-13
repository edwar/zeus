import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";

/**
 * Anula el acta de entrega para volver a firmarla (p. ej. firmó la persona equivocada). Solo gestión: el equipo en campo no puede
 * deshacer una firma. Los pasos del checklist quedan como estaban.
 */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/projects/[id]/handover">) {
  const a = await authorize(req, "projects.manage");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const r = await prisma.handover.deleteMany({ where: { projectId: id } });
  return r.count ? new Response(null, { status: 204 }) : Response.json({ error: "not_found" }, { status: 404 });
}

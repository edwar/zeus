import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { portalInfo } from "@/lib/portal-info";

/**
 * Genera un enlace nuevo para el portal del cliente: sube la versión, así que el enlace anterior (y cualquier correo
 * viejo que lo tenga) deja de funcionar. Úsalo si el enlace se compartió por error. Solo gestión.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/projects/[id]/portal">) {
  const a = await authorize(req, "projects.manage");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const current = await prisma.project.findUnique({ where: { id }, select: { quoteId: true, quote: { select: { lang: true, status: true, contactName: true, contactPhone: true } } } });
  if (!current) return Response.json({ error: "not_found" }, { status: 404 });
  if (!current.quoteId) return Response.json({ error: "no_quote" }, { status: 409 });
  const p = await prisma.project.update({ where: { id }, data: { portalVersion: { increment: 1 } }, select: { id: true, portalVersion: true } });
  // Queda en el historial de la solicitud: quién renovó el enlace y cuándo.
  await prisma.quoteEvent.create({ data: { quoteId: current.quoteId, toStatus: current.quote?.status ?? "approved", subject: "portal", note: `v${p.portalVersion}`, userName: a.name } });
  return Response.json(portalInfo(p, current.quote!), { headers: { "Cache-Control": "no-store" } });
}

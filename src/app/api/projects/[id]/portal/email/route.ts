import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { portalUrl } from "@/lib/portal-link";
import { noticePortal } from "@/lib/client-notices";

/** Manda al cliente por correo el enlace vigente de su portal (el servidor lo reconstruye: no hace falta que llegue en la petición). */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/projects/[id]/portal/email">) {
  const a = await authorize(req, "projects.manage");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const p = await prisma.project.findUnique({ where: { id }, select: { id: true, quoteId: true, portalVersion: true, quote: { select: { lang: true } } } });
  if (!p) return Response.json({ error: "not_found" }, { status: 404 });
  if (!p.quoteId) return Response.json({ error: "no_quote" }, { status: 409 });
  const outcome = await noticePortal(p.quoteId, portalUrl(p.quote?.lang ?? "es", p.id, p.portalVersion), a.name);
  return Response.json({ outcome });
}

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { noteBody } from "@/lib/crm";

/** Nota libre en la solicitud: queda en el historial (sin cambiar el estado), con quién la escribió. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/quotes/[id]/notes">) {
  const big = tooLarge(req, 5_000);
  if (big) return big;
  const a = await authorize(req, "quotes");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const parsed = noteBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const q = await prisma.quoteRequest.findUnique({ where: { id }, select: { status: true } });
  if (!q) return Response.json({ error: "not_found" }, { status: 404 });
  const e = await prisma.quoteEvent.create({ data: { quoteId: id, toStatus: q.status, subject: "note", note: parsed.data.body, userName: a.name }, select: { id: true } });
  return Response.json({ id: e.id }, { status: 201 });
}

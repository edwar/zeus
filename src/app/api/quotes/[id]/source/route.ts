import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { SOURCES } from "@/lib/crm";

const body = z.object({ source: z.enum(SOURCES) });

/** Corrige el origen de una solicitud (p. ej. «Referido» cuando el cliente cuenta que lo recomendaron). Queda en el historial. */
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/quotes/[id]/source">) {
  const a = await authorize(req, "quotes");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const q = await prisma.quoteRequest.findUnique({ where: { id }, select: { status: true, source: true } });
  if (!q) return Response.json({ error: "not_found" }, { status: 404 });
  if (q.source === parsed.data.source) return Response.json({ id, source: q.source });
  await prisma.$transaction([
    prisma.quoteRequest.update({ where: { id }, data: { source: parsed.data.source } }),
    prisma.quoteEvent.create({ data: { quoteId: id, toStatus: q.status, subject: "source", note: `${q.source}→${parsed.data.source}`, userName: a.name } }),
  ]);
  return Response.json({ id, source: parsed.data.source });
}

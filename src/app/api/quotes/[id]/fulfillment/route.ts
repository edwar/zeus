import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { guardApi } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { kitEditable } from "@/lib/quote-flow";

const body = z.object({ fulfillment: z.enum(["install", "kit_only"]), note: z.string().trim().max(300).optional() });

/**
 * El asesor corrige la modalidad calculada por ubicación (p. ej. aceptamos viajar, o la ubicación del cliente era imprecisa).
 * Solo mientras la solicitud sigue abierta; queda en el historial.
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApi(req, { perm: "quotes" });
  if (denied) return denied;
  const big = tooLarge(req, 5_000);
  if (big) return big;
  const session = await auth.api.getSession({ headers: req.headers });
  const { id } = await ctx.params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const { fulfillment, note } = parsed.data;

  const current = await prisma.quoteRequest.findUnique({ where: { id }, select: { status: true, fulfillment: true } });
  if (!current) return Response.json({ error: "not_found" }, { status: 404 });
  if (!kitEditable(current.status)) return Response.json({ error: "locked" }, { status: 409 });
  if (current.fulfillment === fulfillment) return Response.json({ id, fulfillment, changed: false });

  const done = await prisma.$transaction(async (tx) => {
    const r = await tx.quoteRequest.updateMany({ where: { id, status: current.status, fulfillment: current.fulfillment }, data: { fulfillment } });
    if (r.count === 0) return false;
    await tx.quoteEvent.create({
      data: { quoteId: id, fromStatus: current.status, toStatus: current.status, subject: "fulfillment", note: `${current.fulfillment} → ${fulfillment}${note ? `\n${note}` : ""}`, userName: session?.user.name ?? "—" },
    });
    return true;
  });
  return done ? Response.json({ id, fulfillment, changed: true }) : Response.json({ error: "conflict" }, { status: 409 });
}

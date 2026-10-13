import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hitLimit, ipHashOf } from "@/lib/ratelimit";
import { hashShareToken, TOKEN_RE } from "@/lib/quote-share";
import { tooLarge } from "@/lib/http";
import { notifyClientDecision } from "@/lib/quote-notify";

const body = z.object({
  decision: z.enum(["accepted", "declined"]),
  // Total que el cliente tenía a la vista: si el asesor ajustó el kit mientras tanto, no se acepta un valor que ya cambió.
  total: z.number().positive(),
  note: z.string().trim().max(500).optional(),
});

/**
 * El cliente responde desde su enlace. Esto NO aprueba la solicitud: solo deja la respuesta registrada y avisa al equipo.
 * Es idempotente y a prueba de carreras: la condición del updateMany deja pasar una sola respuesta por enlace.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/q/[token]/decision">) {
  const big = tooLarge(req, 4_000);
  if (big) return big;
  const limit = await hitLimit("quote-decision", ipHashOf(req), 15, 3_600_000);
  if (!limit.ok) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  const { token } = await ctx.params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !TOKEN_RE.test(token)) return Response.json({ error: "invalid_body" }, { status: 400 });
  const { decision, total, note } = parsed.data;

  const hash = hashShareToken(token);
  const q = await prisma.quoteRequest.findUnique({ where: { shareTokenHash: hash }, select: { id: true, total: true, contactName: true } });
  if (!q) return Response.json({ error: "not_found" }, { status: 404 });
  if (Number(q.total) !== total) return Response.json({ error: "changed" }, { status: 409 });

  const now = new Date();
  const done = await prisma.$transaction(async (tx) => {
    const r = await tx.quoteRequest.updateMany({
      where: { id: q.id, shareTokenHash: hash, status: "confirmed", shareExpiresAt: { gt: now }, clientDecision: null, total: q.total },
      data: { clientDecision: decision, clientDecidedAt: now, clientDecisionNote: note || null, clientDecisionTotal: q.total },
    });
    if (r.count === 0) return false;
    await tx.quoteEvent.create({ data: { quoteId: q.id, toStatus: "confirmed", subject: "client_decision", note: `${decision}${note ? `\n${note}` : ""}`, userName: "Cliente" } });
    return true;
  });
  if (!done) return Response.json({ error: "unavailable" }, { status: 409 });

  // El aviso es secundario: si el correo falla, la respuesta del cliente ya quedó guardada.
  await notifyClientDecision({ quoteId: q.id, clientName: q.contactName, decision, note }).catch((e) => console.error("quote notify", e));
  return Response.json({ ok: true, decision });
}

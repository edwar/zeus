import type { NextRequest } from "next/server";
import { tooLarge } from "@/lib/http";
import { hitLimit, ipHashOf } from "@/lib/ratelimit";
import { readUnsubscribeToken } from "@/lib/unsubscribe";
import { suppressEmail } from "@/lib/suppression";

/**
 * Baja de correos. Sirve al botón de la página y al «envío de un clic» (RFC 8058) que usan Gmail y Outlook: ambos son un
 * POST. Un GET no hace nada, para que un antivirus o la vista previa de un correo no den de baja a nadie sin querer.
 * Idempotente: repetirlo no cambia nada.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/unsubscribe/[token]">) {
  const big = tooLarge(req, 2_000);
  if (big) return big;
  const limit = await hitLimit("unsubscribe", ipHashOf(req), 30, 3_600_000);
  if (!limit.ok) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  const { token } = await ctx.params;
  const email = readUnsubscribeToken(token);
  if (!email) return Response.json({ error: "invalid_token" }, { status: 400 });
  await suppressEmail(email, "unsubscribe", "cliente");
  return Response.json({ ok: true });
}

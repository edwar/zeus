import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { hashShareToken, newShareToken, shareExpiry } from "@/lib/quote-share";
import { absoluteUrl } from "@/lib/site";

/**
 * Genera (o rota) el enlace público de la cotización. El token solo viaja en esta respuesta: en la base queda su hash.
 * Rotar invalida el enlace anterior y borra la respuesta que el cliente hubiera dado, porque ya no aplica.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/quotes/[id]/share">) {
  const a = await authorize(req, "quotes");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  // El enlace se abre en el idioma en que el cliente pidió la cotización, no en el del asesor.
  const quote = await prisma.quoteRequest.findUnique({ where: { id }, select: { lang: true } });
  if (!quote) return Response.json({ error: "not_found" }, { status: 404 });
  const lang = quote.lang === "en" ? "en" : "es";

  const token = newShareToken();
  const expiresAt = shareExpiry();
  const done = await prisma.$transaction(async (tx) => {
    // Solo con el cálculo confirmado; el estado esperado evita que otra persona lo cambie a mitad.
    const r = await tx.quoteRequest.updateMany({
      where: { id, status: "confirmed" },
      data: { shareTokenHash: hashShareToken(token), shareExpiresAt: expiresAt, clientDecision: null, clientDecidedAt: null, clientDecisionNote: null, clientDecisionTotal: null },
    });
    if (r.count === 0) return false;
    await tx.quoteEvent.create({ data: { quoteId: id, toStatus: "confirmed", subject: "share", note: expiresAt.toISOString(), userName: a.name } });
    return true;
  });
  if (!done) {
    const exists = await prisma.quoteRequest.count({ where: { id } });
    return Response.json({ error: exists ? "not_confirmed" : "not_found" }, { status: exists ? 409 : 404 });
  }
  return Response.json({ url: absoluteUrl(`/${lang}/q/${token}`), expiresAt: expiresAt.toISOString() }, { headers: { "Cache-Control": "no-store" } });
}

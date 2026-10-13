import type { NextRequest } from "next/server";
import { guardApi } from "@/lib/session";
import { findQuoteDoc } from "@/lib/quote-doc";
import { pdfFileName, renderQuotePdf } from "@/lib/quote-pdf";
import { getDict } from "@/i18n";
import { hasLocale, defaultLocale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";

/** PDF de la cotización para el equipo, disponible en cualquier estado. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/quotes/[id]/pdf">) {
  const denied = await guardApi(req, { perm: "quotes" });
  if (denied) return denied;
  const { id } = await ctx.params;
  const doc = await findQuoteDoc(id);
  if (!doc) return Response.json({ error: "not_found" }, { status: 404 });
  const q = await prisma.quoteRequest.findUnique({ where: { id }, select: { shareExpiresAt: true } });
  const l = req.nextUrl.searchParams.get("lang") ?? "";
  const lang = hasLocale(l) ? l : defaultLocale;
  const pdf = await renderQuotePdf({ doc, t: getDict(lang), lang, validUntil: q?.shareExpiresAt ?? null });
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${pdfFileName(doc.ref)}"`, "Cache-Control": "private, no-store" } });
}

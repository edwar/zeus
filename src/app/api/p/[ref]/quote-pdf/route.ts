import type { NextRequest } from "next/server";
import { findQuoteDoc } from "@/lib/quote-doc";
import { findPortalQuoteId } from "@/lib/portal";
import { pdfFileName, renderQuotePdf } from "@/lib/quote-pdf";
import { hitLimit, ipHashOf } from "@/lib/ratelimit";
import { getDict } from "@/i18n";
import { hasLocale, defaultLocale } from "@/i18n/config";

/** PDF de la cotización desde el portal del cliente. Mismo límite por IP que el del enlace de la cotización. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/p/[ref]/quote-pdf">) {
  const limit = await hitLimit("quote-pdf", ipHashOf(req), 20, 3_600_000);
  if (!limit.ok) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  const { ref } = await ctx.params;
  const quoteId = await findPortalQuoteId(ref);
  const doc = quoteId ? await findQuoteDoc(quoteId) : null;
  if (!doc) return Response.json({ error: "not_found" }, { status: 404 });
  const l = req.nextUrl.searchParams.get("lang") ?? "";
  const lang = hasLocale(l) ? l : defaultLocale;
  const pdf = await renderQuotePdf({ doc, t: getDict(lang), lang, validUntil: null });
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${pdfFileName(doc.ref)}"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}

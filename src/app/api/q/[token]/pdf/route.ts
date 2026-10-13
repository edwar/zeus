import type { NextRequest } from "next/server";
import { findSharedQuote } from "@/lib/quote-doc";
import { pdfFileName, renderQuotePdf } from "@/lib/quote-pdf";
import { hitLimit, ipHashOf } from "@/lib/ratelimit";
import { getDict } from "@/i18n";
import { hasLocale, defaultLocale } from "@/i18n/config";

/** PDF para el cliente. Solo mientras el enlace esté vigente; el límite por IP evita usarlo para generar carga. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/q/[token]/pdf">) {
  const limit = await hitLimit("quote-pdf", ipHashOf(req), 20, 3_600_000);
  if (!limit.ok) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  const { token } = await ctx.params;
  const shared = await findSharedQuote(token);
  // Un enlace vencido o cerrado responde igual que uno inexistente: no confirma que la cotización existe.
  if (!shared || shared.state === "expired" || shared.state === "closed") return Response.json({ error: "not_found" }, { status: 404 });
  const l = req.nextUrl.searchParams.get("lang") ?? "";
  const lang = hasLocale(l) ? l : defaultLocale;
  const pdf = await renderQuotePdf({ doc: shared.doc, t: getDict(lang), lang, validUntil: shared.expiresAt });
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${pdfFileName(shared.doc.ref)}"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}

import type { NextRequest } from "next/server";
import { findPortalProjectId } from "@/lib/portal";
import { loadActa } from "@/lib/field-server";
import { actaFileName, renderActa } from "@/lib/acta-pdf";
import { hitLimit, ipHashOf } from "@/lib/ratelimit";
import { getDict } from "@/i18n";
import { defaultLocale, hasLocale } from "@/i18n/config";

/** Acta de entrega firmada, desde el portal del cliente. Mismo límite por conexión que el PDF de la cotización. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/p/[ref]/acta">) {
  const limit = await hitLimit("quote-pdf", ipHashOf(req), 20, 3_600_000);
  if (!limit.ok) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  const { ref } = await ctx.params;
  const projectId = await findPortalProjectId(ref);
  const l = req.nextUrl.searchParams.get("lang") ?? "";
  const lang = hasLocale(l) ? l : defaultLocale;
  const acta = projectId ? await loadActa(projectId, lang) : null;
  if (!acta) return Response.json({ error: "not_found" }, { status: 404 });
  const pdf = await renderActa(acta, getDict(lang), lang);
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${actaFileName(acta.ref)}"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}

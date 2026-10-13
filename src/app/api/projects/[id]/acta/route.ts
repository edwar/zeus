import type { NextRequest } from "next/server";
import { authorize, projectVisible } from "@/lib/session";
import { loadActa } from "@/lib/field-server";
import { actaFileName, renderActa } from "@/lib/acta-pdf";
import { getDict } from "@/i18n";
import { defaultLocale, hasLocale } from "@/i18n/config";

/** Acta de entrega y conformidad en PDF, para el equipo (quien puede ver el proyecto). 404 si todavía no se firmó. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/projects/[id]/acta">) {
  const a = await authorize(req, "projects.view");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  if (!(await projectVisible(a, id))) return Response.json({ error: "not_found" }, { status: 404 });
  const l = req.nextUrl.searchParams.get("lang") ?? "";
  const lang = hasLocale(l) ? l : defaultLocale;
  const acta = await loadActa(id, lang);
  if (!acta) return Response.json({ error: "not_found" }, { status: 404 });
  const pdf = await renderActa(acta, getDict(lang), lang);
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${actaFileName(acta.ref)}"`, "Cache-Control": "private, no-store" } });
}

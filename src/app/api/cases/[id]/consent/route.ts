import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { consentBody } from "@/lib/cases";
import { adminDto } from "@/lib/cases-server";
import { invalidateCases } from "@/lib/cases-data";

/**
 * Registra (o retira) la autorización del cliente para publicar su caso. Retirarla despublica el caso al instante: el
 * cliente manda sobre su historia. Lo que dejó escrito el equipo queda como constancia de la retirada.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/cases/[id]/consent">) {
  const big = tooLarge(req, 5_000);
  if (big) return big;
  const a = await authorize(req, "cases");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const parsed = consentBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const c = await prisma.caseStudy.findUnique({ where: { id }, select: { status: true } });
  if (!c) return Response.json({ error: "not_found" }, { status: 404 });

  const saved = parsed.data.given
    ? await prisma.caseStudy.update({ where: { id }, data: { consentAt: new Date(), consentBy: a.name, consentNote: parsed.data.note } })
    : await prisma.caseStudy.update({
        where: { id },
        data: { consentAt: null, consentBy: a.name, consentNote: `Autorización retirada el ${new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", dateStyle: "long" })}, registrado por ${a.name}.`, status: "draft", publishedAt: null },
      });
  if (c.status === "published" && !parsed.data.given) invalidateCases();
  return Response.json(adminDto(saved));
}

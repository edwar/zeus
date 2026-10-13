import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { caseBody, missingForPublish, type CasePhoto } from "@/lib/cases";
import { adminDto, checkOf, toDay, todayCo } from "@/lib/cases-server";
import { invalidateCases } from "@/lib/cases-data";
import { deletePublic, storageConfigured } from "@/lib/storage";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/cases/[id]">) {
  const a = await authorize(req, "cases");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const c = await prisma.caseStudy.findUnique({ where: { id } });
  return c ? Response.json(adminDto(c)) : Response.json({ error: "not_found" }, { status: 404 });
}

/**
 * Guarda los cambios. Un caso ya publicado no puede quedar incompleto: si el cambio le quitara algo que se exige para
 * publicar (la verificación, una cifra…), se rechaza en vez de dejar en la landing un caso a medias.
 */
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/cases/[id]">) {
  const big = tooLarge(req, 20_000);
  if (big) return big;
  const a = await authorize(req, "cases");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const parsed = caseBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const b = parsed.data;
  const current = await prisma.caseStudy.findUnique({ where: { id } });
  if (!current) return Response.json({ error: "not_found" }, { status: 404 });

  const next = { ...current, ...b, installedOn: toDay(b.installedOn), verifiedOn: toDay(b.verifiedOn) };
  if (current.status === "published") {
    const missing = missingForPublish(checkOf(next), todayCo());
    if (missing.length) return Response.json({ error: "incomplete", missing }, { status: 409 });
  }
  // Quien verifica es quien firma la fecha de verificación: si cambia la fecha o la evidencia, queda esta persona.
  const reverified = b.verifiedOn !== (current.verifiedOn?.toISOString().slice(0, 10) ?? null) || b.evidence !== current.evidence;
  const saved = await prisma.caseStudy.update({
    where: { id },
    data: { ...b, installedOn: toDay(b.installedOn), verifiedOn: toDay(b.verifiedOn), ...(reverified && { verifiedBy: b.verifiedOn ? a.name : null }) },
  });
  if (saved.status === "published") invalidateCases();
  return Response.json(adminDto(saved));
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/cases/[id]">) {
  const a = await authorize(req, "cases");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const c = await prisma.caseStudy.findUnique({ where: { id }, select: { photos: true, status: true } });
  if (!c) return Response.json({ error: "not_found" }, { status: 404 });
  await prisma.caseStudy.delete({ where: { id } });
  // Las fotos de un cliente no se quedan huérfanas en el almacenamiento (si falla el borrado, el caso ya no existe igual).
  if (storageConfigured()) await Promise.allSettled(((c.photos as CasePhoto[] | null) ?? []).map((p) => deletePublic(p.url)));
  if (c.status === "published") invalidateCases();
  return new Response(null, { status: 204 });
}

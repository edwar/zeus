import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { caseBody, missingForPublish, uniqueSlug } from "@/lib/cases";
import { checkOf, toDay, todayCo } from "@/lib/cases-server";

/** Lista de casos (borradores y publicados) con cuánto les falta para poder publicarse. */
export async function GET(req: NextRequest) {
  const a = await authorize(req, "cases");
  if (a.denied) return a.denied;
  const rows = await prisma.caseStudy.findMany({ orderBy: [{ updatedAt: "desc" }], take: 200 });
  const today = todayCo();
  return Response.json({
    items: rows.map((c) => ({
      id: c.id, slug: c.slug, status: c.status, titleEs: c.titleEs, audience: c.audience, town: c.town, kwp: c.kwp,
      updatedAt: c.updatedAt.toISOString(), publishedAt: c.publishedAt?.toISOString() ?? null, missing: missingForPublish(checkOf(c), today).length,
    })),
  });
}

/** Crea un borrador. Publicarlo es otro paso, con sus exigencias. */
export async function POST(req: NextRequest) {
  const big = tooLarge(req, 20_000);
  if (big) return big;
  const a = await authorize(req, "cases");
  if (a.denied) return a.denied;
  const parsed = caseBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const b = parsed.data;
  const taken = new Set((await prisma.caseStudy.findMany({ select: { slug: true } })).map((c) => c.slug));
  const created = await prisma.caseStudy.create({
    data: { ...b, installedOn: toDay(b.installedOn), verifiedOn: toDay(b.verifiedOn), verifiedBy: b.verifiedOn ? a.name : null, slug: uniqueSlug(b.titleEs, taken), createdBy: a.name },
    select: { id: true },
  });
  return Response.json({ id: created.id }, { status: 201 });
}

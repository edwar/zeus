import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { missingForPublish } from "@/lib/cases";
import { adminDto, checkOf, todayCo } from "@/lib/cases-server";
import { invalidateCases } from "@/lib/cases-data";

const body = z.object({ publish: z.boolean() });

/** Publica o retira un caso. Publicar exige TODO lo de `missingForPublish`, sobre todo la autorización del cliente y la verificación. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/cases/[id]/publish">) {
  const a = await authorize(req, "cases");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const c = await prisma.caseStudy.findUnique({ where: { id } });
  if (!c) return Response.json({ error: "not_found" }, { status: 404 });

  if (parsed.data.publish) {
    const missing = missingForPublish(checkOf(c), todayCo());
    if (missing.length) return Response.json({ error: "incomplete", missing }, { status: 409 });
    const saved = await prisma.caseStudy.update({ where: { id }, data: { status: "published", publishedAt: c.publishedAt ?? new Date(), publishedBy: a.name } });
    invalidateCases();
    return Response.json(adminDto(saved));
  }
  const saved = await prisma.caseStudy.update({ where: { id }, data: { status: "draft", publishedAt: null } });
  invalidateCases();
  return Response.json(adminDto(saved));
}

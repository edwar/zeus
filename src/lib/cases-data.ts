import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { savingsOf, type CaseAudience, type CasePhoto } from "@/lib/cases";
import { safeHttpUrl } from "@/lib/url";

export const CASES_TAG = "cases";
/**
 * Los casos públicos caducan YA (no «en unos minutos»): retirar un caso, sobre todo si el cliente retira su autorización, no puede
 * seguir mostrándose desde el caché. `expire: 0` hace que nunca se sirva lo viejo.
 */
export const invalidateCases = () => revalidateTag(CASES_TAG, { expire: 0 });

/**
 * Lo que ve el público de un caso publicado: solo los campos pensados para eso. Nunca incluye quién lo registró, la constancia
 * de la autorización ni datos internos.
 */
export type PublicCase = {
  slug: string;
  audience: CaseAudience;
  titleEs: string; titleEn: string; summaryEs: string; summaryEn: string; quoteEs: string | null; quoteEn: string | null;
  displayName: string; town: string; department: string | null;
  kwp: number; systemType: string; installedOn: string;
  billBefore: number; billAfter: number; currency: string; savingsPct: number; savingsAmount: number;
  evidence: string; verifiedOn: string;
  photos: CasePhoto[];
  publishedAt: string;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

type Row = NonNullable<Awaited<ReturnType<typeof prisma.caseStudy.findFirst>>>;
function toPublic(c: Row): PublicCase | null {
  // Un publicado sin fechas no debería existir (se exige al publicar); si pasa, mejor no mostrarlo que mostrarlo a medias.
  if (!c.installedOn || !c.verifiedOn || !c.publishedAt) return null;
  const s = savingsOf(c.billBefore, c.billAfter);
  return {
    slug: c.slug, audience: c.audience as CaseAudience,
    titleEs: c.titleEs, titleEn: c.titleEn, summaryEs: c.summaryEs, summaryEn: c.summaryEn, quoteEs: c.quoteEs, quoteEn: c.quoteEn,
    displayName: c.displayName, town: c.town, department: c.department,
    kwp: c.kwp, systemType: c.systemType, installedOn: iso(c.installedOn),
    billBefore: c.billBefore, billAfter: c.billAfter, currency: c.currency, savingsPct: s.pct, savingsAmount: s.amount,
    evidence: c.evidence, verifiedOn: iso(c.verifiedOn),
    photos: ((c.photos as CasePhoto[] | null) ?? []).filter((p) => safeHttpUrl(p.url)),
    publishedAt: c.publishedAt.toISOString(),
  };
}

/** Casos publicados, los más recientes primero. Lista vacía mientras no haya ninguno aprobado. */
export async function getPublishedCases(): Promise<PublicCase[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CASES_TAG);
  const rows = await prisma.caseStudy.findMany({ where: { status: "published" }, orderBy: { publishedAt: "desc" }, take: 60 });
  return rows.map(toPublic).filter((c): c is PublicCase => c != null);
}

export async function getPublishedCase(slug: string): Promise<PublicCase | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CASES_TAG);
  const row = await prisma.caseStudy.findFirst({ where: { slug, status: "published" } });
  return row ? toPublic(row) : null;
}

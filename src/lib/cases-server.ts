import type { CaseStudy } from "@/generated/prisma/client";
import { missingForPublish, type CasePhoto, type PublishCheck } from "@/lib/cases";
import { storageConfigured } from "@/lib/storage";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
/** Una fecha de calendario (YYYY-MM-DD) como la guarda Postgres en una columna DATE. */
export const toDay = (s: string | null) => (s ? new Date(`${s}T00:00:00Z`) : null);

/** Hoy en Colombia (YYYY-MM-DD): las fechas «no futuras» se miden con la hora del negocio. */
export const todayCo = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Bogota" });

export const checkOf = (c: CaseStudy): PublishCheck => ({
  titleEs: c.titleEs, summaryEs: c.summaryEs, displayName: c.displayName, town: c.town, kwp: c.kwp, installedOn: iso(c.installedOn),
  billBefore: c.billBefore, billAfter: c.billAfter, evidence: c.evidence, verifiedOn: iso(c.verifiedOn), consentAt: c.consentAt, consentNote: c.consentNote,
});

/** Detalle para el equipo: todo lo editable, la autorización y lo que falta para publicar. */
export function adminDto(c: CaseStudy) {
  return {
    id: c.id, slug: c.slug, status: c.status as "draft" | "published", audience: c.audience,
    titleEs: c.titleEs, titleEn: c.titleEn, summaryEs: c.summaryEs, summaryEn: c.summaryEn, quoteEs: c.quoteEs, quoteEn: c.quoteEn,
    displayName: c.displayName, town: c.town, department: c.department, kwp: c.kwp, systemType: c.systemType, installedOn: iso(c.installedOn),
    billBefore: c.billBefore, billAfter: c.billAfter, evidence: c.evidence, verifiedOn: iso(c.verifiedOn), verifiedBy: c.verifiedBy,
    consent: { at: c.consentAt?.toISOString() ?? null, by: c.consentBy, note: c.consentNote },
    photos: (c.photos as CasePhoto[] | null) ?? [],
    createdBy: c.createdBy, publishedBy: c.publishedBy, publishedAt: c.publishedAt?.toISOString() ?? null, updatedAt: c.updatedAt.toISOString(),
    missing: missingForPublish(checkOf(c), todayCo()),
    storageReady: storageConfigured(),
  };
}
export type CaseAdmin = ReturnType<typeof adminDto>;

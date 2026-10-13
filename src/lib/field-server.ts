import { prisma } from "@/lib/prisma";
import { projectScope } from "@/lib/session";
import type { Role } from "@/lib/roles";
import { checklistFor } from "@/lib/field-checklist";
import type { FieldProject } from "@/lib/field-sync";

const iso = (d: Date) => d.toISOString();
const day = (d: Date) => d.toISOString().slice(0, 10);

/** Crea el checklist del proyecto con la plantilla de su tipo de sistema (si ya existe, no toca nada). */
export async function ensureChecklist(projectId: string, systemType: string | null | undefined): Promise<void> {
  const have = await prisma.installCheck.count({ where: { projectId } });
  if (have > 0) return;
  await prisma.installCheck.createMany({
    data: checklistFor(systemType).map((c, i) => ({ projectId, key: c.key, labelEs: c.es, labelEn: c.en, order: i })),
    skipDuplicates: true,
  });
}

/**
 * Los proyectos que esta persona puede trabajar en campo, con todo lo que necesita (checklist, materiales, hitos, fotos y entrega).
 * El rol equipo solo ve los de su equipo; no incluye datos de contacto del cliente, solo nombre y ciudad.
 */
export async function loadFieldProjects(a: { role: Role; userId: string }, lang: "es" | "en", only?: string): Promise<FieldProject[]> {
  const base = await prisma.project.findMany({ where: { ...projectScope(a.role, a.userId), ...(only && { id: only }) }, select: { id: true, quote: { select: { systemType: true } }, _count: { select: { checks: true } } }, take: 60 });
  // El checklist se genera la primera vez que alguien abre el proyecto en campo.
  await Promise.all(base.filter((p) => p._count.checks === 0).map((p) => ensureChecklist(p.id, p.quote?.systemType)));

  const rows = await prisma.project.findMany({
    where: { id: { in: base.map((p) => p.id) } },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      checks: { orderBy: { order: "asc" } },
      materials: { orderBy: { nameEs: "asc" } },
      milestones: { orderBy: { startDate: "asc" } },
      photos: { orderBy: { takenAt: "asc" }, select: { id: true, checkKey: true, takenAt: true, uploadedBy: true } },
      handover: { select: { signedAt: true, signerName: true } },
    },
  });
  return rows.map((p) => ({
    id: p.id, name: p.name, client: p.client, town: p.town, kwp: p.kwp, stage: p.stage,
    checks: p.checks.map((c) => ({ key: c.key, labelEs: c.labelEs, labelEn: c.labelEn, order: c.order, done: c.done, doneAt: c.doneAt ? iso(c.doneAt) : null, doneBy: c.doneBy, note: c.note })),
    materials: p.materials.map((m) => ({ id: m.id, name: lang === "en" ? m.nameEn : m.nameEs, qty: m.qty, ready: m.ready })),
    milestones: p.milestones.map((m) => ({ id: m.id, label: lang === "en" ? m.labelEn : m.labelEs, startDate: day(m.startDate), len: m.len, done: m.done })),
    photos: p.photos.map((x) => ({ id: x.id, checkKey: x.checkKey, takenAt: iso(x.takenAt), by: x.uploadedBy })),
    handover: p.handover ? { signedAt: iso(p.handover.signedAt), signerName: p.handover.signerName } : null,
  }));
}

import { quoteRef } from "@/lib/quote-doc";
import type { ActaData } from "@/lib/acta-pdf";

/** Datos del acta de entrega de un proyecto (null si aún no se firmó). */
export async function loadActa(projectId: string, lang: "es" | "en"): Promise<ActaData | null> {
  const p = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, client: true, town: true, kwp: true, quoteId: true, handover: true, checks: { orderBy: { order: "asc" } } },
  });
  if (!p?.handover) return null;
  return {
    ref: p.quoteId ? quoteRef(p.quoteId) : p.id.toUpperCase(),
    name: p.name, client: p.client, town: p.town, kwp: p.kwp,
    signedAt: p.handover.signedAt, signerName: p.handover.signerName, signature: p.handover.signature, notes: p.handover.notes, collectedBy: p.handover.collectedBy,
    checks: p.checks.map((c) => ({ label: lang === "en" ? c.labelEn : c.labelEs, doneAt: c.doneAt, doneBy: c.doneBy, done: c.done })),
  };
}

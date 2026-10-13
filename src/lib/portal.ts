import { prisma } from "@/lib/prisma";
import { checkPortalSig, parsePortalRef } from "@/lib/portal-link";
import { milestoneEnd, milestoneState, overallProgress, todayIso, type MsState } from "@/lib/project-progress";
import { quoteRef } from "@/lib/quote-doc";
import { safeHttpUrl } from "@/lib/url";

/**
 * Lo que ve el cliente en su portal. Es una lista blanca a propósito: no incluye cuadrillas, alertas, equipo,
 * responsable, tarifas ni datos de contacto. Si algo nuevo debe mostrarse, se agrega aquí de forma explícita.
 */
export type PortalView = {
  projectId: string;
  ref: string; // referencia de la cotización (ZEUS-XXXXXXXX)
  name: string;
  client: string;
  town: string;
  kwp: number;
  stage: "lead" | "visit" | "design" | "install" | "monitor";
  overall: number;
  milestones: { id: string; label: string; start: string; end: string; len: number; done: number; state: MsState }[];
  materials: { total: number; ready: number; items: { id: string; name: string; ready: boolean }[] };
  monitorUrl: string | null;
  estimate: { monthlyKwh: number | null; monthlySavings: number | null; currency: string };
  approvedAt: string | null;
  /** Si el cliente ya firmó la entrega: el portal ofrece el acta en PDF. */
  handover: { signedAt: string } | null;
  /** Solo los documentos que el equipo marcó como compartidos con el cliente. */
  documents: { id: string; kind: string; title: string; size: number }[];
};

const TZ = "America/Bogota";

/** Busca el proyecto de un enlace del portal. Devuelve null si el enlace no es válido (mismo resultado que si no existe). */
export async function findPortalProject(ref: string, lang: "es" | "en"): Promise<PortalView | null> {
  const parsed = parsePortalRef(ref);
  if (!parsed) return null;
  const p = await prisma.project.findUnique({
    where: { id: parsed.id },
    select: {
      id: true, name: true, client: true, town: true, kwp: true, stage: true, quoteId: true, portalVersion: true, monitorUrl: true,
      handover: { select: { signedAt: true } },
      documents: { where: { visibleToClient: true }, orderBy: { createdAt: "asc" }, select: { id: true, kind: true, title: true, size: true } },
      milestones: { orderBy: { startDate: "asc" }, select: { id: true, labelEs: true, labelEn: true, startDate: true, len: true, done: true } },
      materials: { orderBy: { nameEs: "asc" }, select: { id: true, nameEs: true, nameEn: true, ready: true } },
      quote: { select: { id: true, sizing: true, currency: true, events: { where: { toStatus: "approved" }, orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } } } },
    },
  });
  // Sin cotización de origen no hay portal; una firma que no corresponde se trata igual que un proyecto inexistente.
  if (!p || !p.quote || !checkPortalSig(p.id, parsed.sig, p.portalVersion)) return null;

  const today = todayIso(TZ);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const ms = p.milestones.map((m) => {
    const start = iso(m.startDate);
    const base = { startDate: start, len: m.len, done: m.done };
    return { id: m.id, label: lang === "en" ? m.labelEn : m.labelEs, start, end: milestoneEnd(base), len: m.len, done: m.done, state: milestoneState(base, today) };
  });
  const sizing = p.quote.sizing as { monthlySolarKwh?: number; monthlySavings?: number | null };
  return {
    projectId: p.id,
    ref: quoteRef(p.quote.id),
    name: p.name,
    client: p.client,
    town: p.town,
    kwp: p.kwp,
    stage: p.stage,
    overall: overallProgress(ms.map((m) => ({ startDate: m.start, len: m.len, done: m.done }))),
    milestones: ms,
    materials: {
      total: p.materials.length,
      ready: p.materials.filter((m) => m.ready).length,
      items: p.materials.map((m) => ({ id: m.id, name: lang === "en" ? m.nameEn : m.nameEs, ready: m.ready })),
    },
    // Solo https: el enlace lo escribe el equipo y se muestra al cliente como botón.
    monitorUrl: safeHttpUrl(p.monitorUrl),
    estimate: { monthlyKwh: sizing.monthlySolarKwh ?? null, monthlySavings: sizing.monthlySavings ?? null, currency: p.quote.currency },
    approvedAt: p.quote.events[0]?.createdAt.toISOString() ?? null,
    handover: p.handover ? { signedAt: p.handover.signedAt.toISOString() } : null,
    documents: p.documents,
  };
}

/** Id de la solicitud de un enlace válido (para el PDF de la cotización). */
export async function findPortalQuoteId(ref: string): Promise<string | null> {
  const parsed = parsePortalRef(ref);
  if (!parsed) return null;
  const p = await prisma.project.findUnique({ where: { id: parsed.id }, select: { quoteId: true, portalVersion: true } });
  return p?.quoteId && checkPortalSig(parsed.id, parsed.sig, p.portalVersion) ? p.quoteId : null;
}

/** Id del proyecto de un enlace válido del portal (para el acta de entrega). */
export async function findPortalProjectId(ref: string): Promise<string | null> {
  const parsed = parsePortalRef(ref);
  if (!parsed) return null;
  const p = await prisma.project.findUnique({ where: { id: parsed.id }, select: { id: true, quoteId: true, portalVersion: true } });
  return p?.quoteId && checkPortalSig(p.id, parsed.sig, p.portalVersion) ? p.id : null;
}

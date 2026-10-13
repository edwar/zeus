import { prisma } from "@/lib/prisma";
import { portalPath } from "@/lib/portal-link";
import { hashShareToken, shareState, TOKEN_RE, type ClientDecision, type ShareState } from "@/lib/quote-share";
import type { Prisma } from "@/generated/prisma/client";

export type QuoteFinancing = { downPct: number; termMonths: number; rateEA: number; down: number; financed: number; monthly: number; totalPaid: number };

/**
 * Lo que ve el cliente en su enlace y lo que lleva el PDF. Nunca incluye correo, teléfono, factura, costos ni
 * tarifas internas: solo lo necesario para entender la propuesta.
 */
export type QuoteDoc = {
  ref: string;
  createdAt: Date;
  name: string;
  city: string | null;
  systemType: "ongrid" | "hybrid" | "offgrid";
  kwp: number;
  fulfillment: "install" | "kit_only" | "unknown";
  currency: string;
  total: number;
  items: { name: string; unitPrice: number; qty: number }[];
  financing: QuoteFinancing | null;
};

const quoteInclude = { items: { orderBy: [{ kind: "asc" }, { nameSnapshot: "asc" }] } } satisfies Prisma.QuoteRequestInclude;
type QuoteWithItems = Prisma.QuoteRequestGetPayload<{ include: typeof quoteInclude }>;

/** Referencia corta y legible para citar la cotización por teléfono o mensaje. */
export const quoteRef = (id: string) => `ZEUS-${id.slice(-8).toUpperCase()}`;

export function toQuoteDoc(q: QuoteWithItems): QuoteDoc {
  const f = q.financing as Partial<QuoteFinancing> | null;
  return {
    ref: quoteRef(q.id),
    createdAt: q.createdAt,
    name: q.contactName,
    city: q.city,
    systemType: q.systemType as QuoteDoc["systemType"],
    kwp: (q.sizing as { kwp?: number }).kwp ?? 0,
    fulfillment: q.fulfillment as QuoteDoc["fulfillment"],
    currency: q.currency,
    total: Number(q.total),
    items: q.items.map((i) => ({ name: i.nameSnapshot, unitPrice: Number(i.unitPrice), qty: i.qty })),
    financing: f && typeof f.monthly === "number" ? { downPct: f.downPct ?? 0, termMonths: f.termMonths ?? 0, rateEA: f.rateEA ?? 0, down: f.down ?? 0, financed: f.financed ?? 0, monthly: f.monthly, totalPaid: f.totalPaid ?? 0 } : null,
  };
}

/** Cotización para el equipo (PDF interno): se busca por id y se autoriza en la ruta. */
export async function findQuoteDoc(id: string): Promise<QuoteDoc | null> {
  const q = await prisma.quoteRequest.findUnique({ where: { id }, include: quoteInclude });
  return q && toQuoteDoc(q);
}

export type SharedQuote = { id: string; doc: QuoteDoc; state: ShareState; expiresAt: Date | null; decision: ClientDecision | null; /** Portal del proyecto, si la solicitud ya se aprobó y tiene proyecto. */ portalHref: string | null };

/** Busca por el hash del token. Un token mal formado ni siquiera consulta la base. */
export async function findSharedQuote(token: string): Promise<SharedQuote | null> {
  if (!TOKEN_RE.test(token)) return null;
  const q = await prisma.quoteRequest.findUnique({ where: { shareTokenHash: hashShareToken(token) }, include: { ...quoteInclude, project: { select: { id: true, portalVersion: true } } } });
  if (!q) return null;
  return { id: q.id, doc: toQuoteDoc(q), state: shareState(q), expiresAt: q.shareExpiresAt, decision: q.clientDecision as ClientDecision | null, portalHref: q.status === "approved" && q.project ? portalPath(q.lang, q.project.id, q.project.portalVersion) : null };
}

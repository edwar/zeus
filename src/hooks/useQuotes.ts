"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { QuoteStatus } from "@/lib/quote-flow";
import type { Fulfillment } from "@/lib/service-area";
import type { Source } from "@/lib/crm";
import type { FollowUp } from "@/hooks/useCrm";

export type { QuoteStatus };
export type QuoteListItem = { id: string; status: QuoteStatus; contactName: string; city: string | null; systemType: "ongrid" | "hybrid" | "offgrid"; total: number; currency: string; itemCount: number; createdAt: string; fulfillment: Fulfillment };
export type QuoteDetail = {
  id: string; status: QuoteStatus; lang: "es" | "en"; source: Source; lead: { id: string; name: string } | null; followUps: FollowUp[]; contactName: string; contactEmail: string; contactPhone: string; city: string | null;
  systemType: "ongrid" | "hybrid" | "offgrid"; total: number; currency: string; createdAt: string;
  bill: { lat?: number | null; lon?: number | null; monthlyKwh: number; tariff: number | null; operator: string | null; municipality: string | null; department: string | null; estrato: number | null; connection: string | null; coveragePct: number; peakSunHours: number; backupKw?: number; autonomyHours?: number };
  sizing: { kwp: number; monthlySolarKwh: number; monthlySavings: number | null; batteryNominalKwh: number };
  discardReason: string | null; originalTotal: number | null; projectId: string | null; fulfillment: Fulfillment; distanceKm: number | null; installerChoice: "zeus" | "own" | null; installFee: number | null;
  financing: { downPct: number; termMonths: number; rateEA: number; entity: string | null; usuryEA: number | null; down: number; financed: number; monthly: number; interest: number; totalPaid: number } | null; team: { id: string; name: string } | null;
  share: { expiresAt: string | null; decision: "accepted" | "declined" | null; decidedAt: string | null; note: string | null };
  events: { id: string; kitChange: boolean; subject: string | null; from: QuoteStatus | null; to: QuoteStatus; note: string | null; by: string; at: string }[];
  items: { id: string; productId: string | null; kind: string; name: string; unitPrice: number; qty: number }[];
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw Object.assign(new Error(String(res.status)), { code: body?.error });
  }
  return res.json();
}

export type QuoteListFilters = { status: "all" | QuoteStatus; page: number; pageSize: number };
export type QuotePage = { items: QuoteListItem[]; total: number; page: number; pageSize: number; counts: Record<"all" | QuoteStatus, number> };

/** Solicitudes paginadas en el servidor; los conteos por estado cubren todas las solicitudes, no solo la página. */
export const useQuotes = (f: QuoteListFilters) =>
  useQuery({
    queryKey: ["quotes", "list", f],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(f.page), pageSize: String(f.pageSize) });
      if (f.status !== "all") p.set("status", f.status);
      return fetch(`/api/quotes?${p}`).then(json<QuotePage>);
    },
    placeholderData: keepPreviousData,
  });
export const useQuote = (id: string) => useQuery({ queryKey: ["quotes", id], queryFn: () => fetch(`/api/quotes/${id}`).then(json<QuoteDetail>) });

export function useSetQuoteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: QuoteStatus; note?: string }) =>
      fetch(`/api/quotes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note }) }).then(json<{ id: string; status: QuoteStatus }>),
    onSettled: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
}

export type CatalogHit = { id: string; name: string; kind: string; unitPrice: number };
export const useQuoteCatalog = (q: string, kind: string) =>
  useQuery({
    queryKey: ["quote-catalog", q, kind],
    queryFn: () => fetch(`/api/quotes/catalog?${new URLSearchParams({ ...(q && { q }), ...(kind && { kind }) })}`).then(json<CatalogHit[]>),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });

export function useSaveQuoteItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: { productId: string; qty: number }[] }) =>
      fetch(`/api/quotes/${id}/items`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) }).then(json<{ id: string; total: number; changed: boolean }>),
    onSettled: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
}

export function useSetFulfillment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fulfillment, note }: { id: string; fulfillment: "install" | "kit_only"; note?: string }) =>
      fetch(`/api/quotes/${id}/fulfillment`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fulfillment, note }) }).then(json<{ id: string; fulfillment: string }>),
    onSettled: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
}

export function useSetQuoteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, teamId }: { id: string; teamId: string | null }) =>
      fetch(`/api/quotes/${id}/team`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId }) }).then(json<{ id: string }>),
    onSettled: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
}

/** Crea o rota el enlace público de la cotización; la URL solo viaja en esta respuesta. */
export function useShareQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => fetch(`/api/quotes/${id}/share`, { method: "POST" }).then(json<{ url: string; expiresAt: string }>),
    onSettled: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
}

export type NoticeOutcome = "sent" | "failed" | "skipped";
/** Manda por correo el enlace recién generado (el servidor comprueba que sea el vigente de esa solicitud). */
export function useEmailQuoteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, url }: { id: string; url: string }) =>
      fetch(`/api/quotes/${id}/share/email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }).then(json<{ outcome: NoticeOutcome | null }>),
    onSettled: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
}

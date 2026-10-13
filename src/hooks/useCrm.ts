"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LeadStatus, Source, SourceRow } from "@/lib/crm";

export type Target = { kind: "quote" | "lead"; id: string; name: string };
export type FollowUp = { id: string; dueOn: string; bucket: "overdue" | "today" | "upcoming" | null; note: string; assigneeId: string | null; assigneeName: string | null; doneAt: string | null; doneBy: string | null; createdBy: string; target: Target };
export type LeadRow = { id: string; name: string; phone: string | null; email: string | null; city: string | null; source: Source; status: LeadStatus; createdAt: string; createdBy: string; quoteId: string | null; nextFollowUp: string | null };
export type LeadDetail = Omit<LeadRow, "nextFollowUp"> & { lostReason: string | null; consentAt: string; notes: { id: string; body: string; by: string; at: string }[]; followUps: FollowUp[] };

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; of?: { kind: string; id: string; name: string } } | null;
    throw Object.assign(new Error(String(res.status)), { code: body?.error, of: body?.of });
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
const send = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }).then(json);

export type FollowUpsData = { today: string; items: FollowUp[]; done: FollowUp[]; counts: { overdue: number; today: number; upcoming: number } };
export const useFollowUps = (scope: "mine" | "all") => useQuery({ queryKey: ["crm", "followups", scope], queryFn: () => fetch(`/api/followups?scope=${scope}`).then(json<FollowUpsData>) });
/** Cuántos recordatorios propios están vencidos o son de hoy (insignia del menú). */
export const useDueCount = (enabled: boolean) => useQuery({ queryKey: ["crm", "due"], enabled, queryFn: () => fetch("/api/followups?counts=1").then(json<{ due: number }>), refetchInterval: 5 * 60_000, staleTime: 60_000 });
export const useAssignees = () => useQuery({ queryKey: ["crm", "assignees"], queryFn: () => fetch("/api/crm/assignees").then(json<{ me: string; users: { id: string; name: string }[] }>), staleTime: 5 * 60_000 });

export const useLeads = (status: "all" | LeadStatus) =>
  useQuery({ queryKey: ["crm", "leads", status], queryFn: () => fetch(`/api/leads${status === "all" ? "" : `?status=${status}`}`).then(json<{ items: LeadRow[]; counts: Record<"all" | LeadStatus, number> }>) });
export const useLead = (id: string) => useQuery({ queryKey: ["crm", "lead", id], queryFn: () => fetch(`/api/leads/${id}`).then(json<LeadDetail>) });
export const useCrmSummary = (days: string) => useQuery({ queryKey: ["crm", "summary", days], queryFn: () => fetch(`/api/crm/summary?days=${days}`).then(json<{ days: string; rows: SourceRow[] }>) });

/** Cualquier cambio de seguimiento refresca todo lo del CRM y, si toca una solicitud, también su detalle. */
function useCrmMutation<V, R = unknown>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["crm"] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}

export type LeadInput = { name: string; phone: string; email: string; city: string; source: string; note?: string; followUpOn?: string; consent: true };
export const useCreateLead = () => useCrmMutation((v: LeadInput) => send("/api/leads", "POST", v) as Promise<{ id: string }>);
export const usePatchLead = (id: string) => useCrmMutation((v: Record<string, unknown>) => send(`/api/leads/${id}`, "PATCH", v));
export const useAddLeadNote = (id: string) => useCrmMutation((body: string) => send(`/api/leads/${id}/notes`, "POST", { body }));
export const useAddQuoteNote = (id: string) => useCrmMutation((body: string) => send(`/api/quotes/${id}/notes`, "POST", { body }));
export const useSetQuoteSource = (id: string) => useCrmMutation((source: string) => send(`/api/quotes/${id}/source`, "PUT", { source }));
export const useAddFollowUp = (target: { kind: "quote" | "lead"; id: string }) =>
  useCrmMutation((v: { dueOn: string; note: string; assigneeId?: string | null }) => send(`/api/${target.kind === "quote" ? "quotes" : "leads"}/${target.id}/followups`, "POST", v));
export const usePatchFollowUp = () => useCrmMutation((v: { id: string; done?: boolean; dueOn?: string; note?: string }) => send(`/api/followups/${v.id}`, "PATCH", { done: v.done, dueOn: v.dueOn, note: v.note }));
export const useDeleteFollowUp = () => useCrmMutation((id: string) => send(`/api/followups/${id}`, "DELETE"));

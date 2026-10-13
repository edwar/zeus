"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type StockRow = { productId: string; name: string; sku: string | null; manufacturer: string; source: "manual" | "autosolar"; onHand: number; minQty: number; low: boolean; avgCost: number | null; supplierPrice: number | null; price: number; pending: number };
export type StockMove = { id: string; kind: "purchase" | "adjust" | "project" | "return"; qty: number; unitCost: number | null; balance: number; note: string | null; userName: string; createdAt: string; project: { id: string; name: string | null; client: string | null } | null };
export type StockCandidate = { id: string; name: string; sku: string | null; source: "manual" | "autosolar"; manufacturer: string; supplierPrice: number | null };
export type Margin = { revenue: number; cost: number; margin: number; pct: number | null; incomplete: boolean; estimated: boolean };

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw Object.assign(new Error(String(res.status)), { code: body?.error });
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
const send = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }).then(json);

export const useStock = () => useQuery({ queryKey: ["stock", "list"], queryFn: () => fetch("/api/stock").then(json<StockRow[]>) });
export const useStockMoves = (productId: string | null) => useQuery({ queryKey: ["stock", "moves", productId], enabled: Boolean(productId), queryFn: () => fetch(`/api/stock/${productId}/moves`).then(json<StockMove[]>) });
export const useStockCandidates = (q: string, enabled: boolean) => useQuery({ queryKey: ["stock", "candidates", q], enabled, queryFn: () => fetch(`/api/stock/candidates?q=${encodeURIComponent(q)}`).then(json<StockCandidate[]>) });
export const useProjectMargin = (projectId: string, enabled: boolean) => useQuery({ queryKey: ["project", projectId, "margin"], enabled, queryFn: () => fetch(`/api/projects/${projectId}/margin`).then(json<Margin>) });

function useStockMutation<V, R = unknown>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => { qc.invalidateQueries({ queryKey: ["stock"] }); qc.invalidateQueries({ queryKey: ["project"] }); } });
}
export const useEnableStock = () => useStockMutation((v: { productId: string; onHand: number; unitCost: number | null; minQty: number }) => send("/api/stock", "POST", v));
export const useReceiveStock = (productId: string) => useStockMutation((v: { qty: number; unitCost: number; note: string | null }) => send(`/api/stock/${productId}/moves`, "POST", { kind: "purchase", ...v }));
export const useAdjustStock = (productId: string) => useStockMutation((v: { counted: number; note: string }) => send(`/api/stock/${productId}/moves`, "POST", { kind: "adjust", ...v }));
export const useSetMinQty = (productId: string) => useStockMutation((minQty: number) => send(`/api/stock/${productId}`, "PATCH", { minQty }));
export const useDisableStock = () => useStockMutation((productId: string) => send(`/api/stock/${productId}`, "DELETE"));

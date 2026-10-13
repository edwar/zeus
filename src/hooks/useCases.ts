"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CaseAdmin } from "@/lib/cases-server";
import type { CaseBody, Missing } from "@/lib/cases";

export type { CaseAdmin };
export type CaseListItem = { id: string; slug: string; status: "draft" | "published"; titleEs: string; audience: string; town: string; kwp: number; updatedAt: string; publishedAt: string | null; missing: number };
export type CaseInput = Omit<CaseBody, "quoteEs" | "quoteEn" | "department"> & { quoteEs: string | null; quoteEn: string | null; department: string | null };

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; missing?: Missing[] } | null;
    throw Object.assign(new Error(String(res.status)), { code: body?.error, missing: body?.missing });
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
const send = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }).then(json);

export const useCases = () => useQuery({ queryKey: ["cases", "list"], queryFn: () => fetch("/api/cases").then(json<{ items: CaseListItem[] }>) });
export const useCase = (id: string) => useQuery({ queryKey: ["cases", id], enabled: Boolean(id), queryFn: () => fetch(`/api/cases/${id}`).then(json<CaseAdmin>) });

function useCaseMutation<V, R = unknown>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: ["cases"] }) });
}

export const useCreateCase = () => useCaseMutation((v: CaseInput) => send("/api/cases", "POST", v) as Promise<{ id: string }>);
export const useSaveCase = (id: string) => useCaseMutation((v: CaseInput) => send(`/api/cases/${id}`, "PUT", v) as Promise<CaseAdmin>);
export const usePublishCase = (id: string) => useCaseMutation((publish: boolean) => send(`/api/cases/${id}/publish`, "POST", { publish }) as Promise<CaseAdmin>);
export const useConsent = (id: string) => useCaseMutation((v: { given: true; note: string } | { given: false }) => send(`/api/cases/${id}/consent`, "POST", v) as Promise<CaseAdmin>);
export const useDeleteCase = () => useCaseMutation((id: string) => send(`/api/cases/${id}`, "DELETE"));
export const useUploadPhoto = (id: string) =>
  useCaseMutation((file: File) => {
    const f = new FormData();
    f.append("file", file);
    return fetch(`/api/cases/${id}/photos`, { method: "POST", body: f }).then(json<CaseAdmin>);
  });
export const useDeletePhoto = (id: string) => useCaseMutation((url: string) => fetch(`/api/cases/${id}/photos?url=${encodeURIComponent(url)}`, { method: "DELETE" }).then(json<CaseAdmin>));

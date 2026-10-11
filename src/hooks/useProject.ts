"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Project } from "@/data/types";

export type ProjectDetail = Project & {
  quoteId: string | null;
  teamDetail: { id: string; name: string; contactName: string; phone: string; city: string; members: string[] } | null;
  installFee: number | null;
  milestones: { id: string; label: string; startDate: string; len: number; crew: "A" | "B" | "E"; done: number }[];
  materials: { id: string; name: string; qty: number; ready: boolean }[];
  monitorUrl: string | null;
  monitorNote: string | null;
  alerts: { id: string; severity: "high" | "mid" | "low"; message: string; at: string; by: string | null; resolvedAt: string | null; resolvedBy: string | null }[];
};
export type MilestoneInput = { label: string; startDate: string; len: number; crew: "A" | "B" | "E"; done?: number };

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(String(res.status));
  return res.status === 204 ? (undefined as T) : res.json();
}
const send = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }).then(json);

export const useProject = (id: string) => useQuery({ queryKey: ["project", id], queryFn: () => fetch(`/api/projects/${id}`).then(json<ProjectDetail>) });

/** Mutación que refresca el proyecto (y la lista, por el avance) al terminar. */
function useProjectMutation<V>(id: string, fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export const useAddMilestone = (id: string) => useProjectMutation(id, (v: MilestoneInput) => send(`/api/projects/${id}/milestones`, "POST", v));
export const useGenerateSchedule = (id: string, lang: string) => useProjectMutation(id, (start: string) => send(`/api/projects/${id}/milestones/template`, "POST", { lang, start }));
export type MilestonePatch = Partial<MilestoneInput>;
export const useUpdateMilestone = (id: string) =>
  useProjectMutation(id, ({ mid, ...patch }: { mid: string } & MilestonePatch) => send(`/api/projects/${id}/milestones/${mid}`, "PATCH", patch));
export const useDeleteMilestone = (id: string) => useProjectMutation(id, (mid: string) => send(`/api/projects/${id}/milestones/${mid}`, "DELETE"));
export const useSetMaterial = (id: string) => useProjectMutation(id, (v: { mid: string; ready: boolean }) => send(`/api/projects/${id}/materials/${v.mid}`, "PATCH", { ready: v.ready }));
export const useSetAllMaterials = (id: string) => useProjectMutation(id, (ready: boolean) => send(`/api/projects/${id}/materials`, "PATCH", { ready }));

export const useAddAlert = (id: string) => useProjectMutation(id, (v: { severity: "high" | "mid" | "low"; message: string }) => send(`/api/projects/${id}/alerts`, "POST", v));
export const useResolveAlert = (id: string) => useProjectMutation(id, (v: { aid: string; resolved: boolean }) => send(`/api/projects/${id}/alerts/${v.aid}`, "PATCH", { resolved: v.resolved }));
export const useDeleteAlert = (id: string) => useProjectMutation(id, (aid: string) => send(`/api/projects/${id}/alerts/${aid}`, "DELETE"));
export const useSaveMonitoring = (id: string) => useProjectMutation(id, (v: { url: string | null; note: string | null }) => send(`/api/projects/${id}/monitoring`, "PUT", v));

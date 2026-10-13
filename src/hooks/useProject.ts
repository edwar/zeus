"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Project } from "@/data/types";

export type ProjectDetail = Project & {
  quoteId: string | null;
  teamDetail: { id: string; name: string; contactName: string; phone: string; city: string; members: string[] } | null;
  installFee: number | null;
  milestones: { id: string; label: string; startDate: string; len: number; crew: "A" | "B" | "E"; done: number }[];
  // `source` y `onHand` solo llegan a quien maneja el inventario: de dónde sale el material y cuánto hay (null = ese producto no lleva inventario)
  materials: { id: string; name: string; qty: number; ready: boolean; source?: "stock" | "supplier"; onHand?: number | null }[];
  /** Portal del cliente (enlace y WhatsApp prellenado). null = sin cotización de origen o rol equipo. */
  portal: { url: string; whatsapp: string } | null;
  /** Avisar al cliente por correo cuando cambia la etapa. null = el proyecto no nació de una cotización (o es el rol equipo). */
  notifyClient: boolean | null;
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
function useProjectMutation<V, R = unknown>(id: string, fn: (v: V) => Promise<R>) {
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
export const useSetMaterialSource = (id: string) =>
  useProjectMutation(id, async (v: { mid: string; source: "stock" | "supplier" }) => {
    const res = await fetch(`/api/projects/${id}/materials/${v.mid}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: v.source }) });
    if (!res.ok) throw Object.assign(new Error(String(res.status)), { code: ((await res.json().catch(() => null)) as { error?: string } | null)?.error });
    return res.json();
  });
export const useSetAllMaterials = (id: string) => useProjectMutation(id, (ready: boolean) => send(`/api/projects/${id}/materials`, "PATCH", { ready }));

export const useAddAlert = (id: string) => useProjectMutation(id, (v: { severity: "high" | "mid" | "low"; message: string }) => send(`/api/projects/${id}/alerts`, "POST", v));
export const useResolveAlert = (id: string) => useProjectMutation(id, (v: { aid: string; resolved: boolean }) => send(`/api/projects/${id}/alerts/${v.aid}`, "PATCH", { resolved: v.resolved }));
export const useDeleteAlert = (id: string) => useProjectMutation(id, (aid: string) => send(`/api/projects/${id}/alerts/${aid}`, "DELETE"));
export const useSaveMonitoring = (id: string) => useProjectMutation(id, (v: { url: string | null; note: string | null }) => send(`/api/projects/${id}/monitoring`, "PUT", v));
export const useSetNotifyClient = (id: string) => useProjectMutation(id, (notifyClient: boolean) => send(`/api/projects/${id}`, "PATCH", { notifyClient }));
export const useRotatePortal = (id: string) => useProjectMutation(id, () => send(`/api/projects/${id}/portal`, "POST") as Promise<{ url: string; whatsapp: string }>);
export const useEmailPortal = (id: string) => useProjectMutation(id, () => send(`/api/projects/${id}/portal/email`, "POST") as Promise<{ outcome: "sent" | "failed" | "skipped" | null }>);

/** Instalación del proyecto vista desde la oficina: checklist, fotos de obra y acta de entrega (los mismos datos del modo campo). */
export type FieldView = import("@/lib/field-sync").FieldProject;
export const useFieldProject = (id: string, lang: string) =>
  useQuery({ queryKey: ["project", id, "field"], queryFn: () => fetch(`/api/field/projects?project=${id}&lang=${lang}`).then(json<{ projects: FieldView[] }>).then((r) => r.projects[0] ?? null) });
export const useVoidHandover = (id: string) => useProjectMutation(id, () => send(`/api/projects/${id}/handover`, "DELETE"));
export const useDeleteSitePhoto = (id: string) => useProjectMutation(id, (photoId: string) => send(`/api/field/photos/${photoId}`, "DELETE"));

/** Documentos del proyecto (planos, permisos, certificados…). Los archivos se descargan por `/api/projects/{id}/documents/{did}`. */
export type ProjectDoc = { id: string; kind: "plan" | "permit" | "certificate" | "contract" | "other"; title: string; fileName: string; contentType: string; size: number; visibleToClient: boolean; uploadedBy: string; createdAt: string };
export const useDocuments = (id: string) => useQuery({ queryKey: ["project", id, "documents"], queryFn: () => fetch(`/api/projects/${id}/documents`).then(json<ProjectDoc[]>) });
export const useUploadDocument = (id: string) =>
  useProjectMutation(id, async (v: { file: File; kind: ProjectDoc["kind"]; title: string; visibleToClient: boolean }) => {
    const body = new FormData();
    body.set("file", v.file);
    body.set("kind", v.kind);
    body.set("title", v.title);
    body.set("visibleToClient", String(v.visibleToClient));
    const res = await fetch(`/api/projects/${id}/documents`, { method: "POST", body });
    if (!res.ok) throw Object.assign(new Error(String(res.status)), { status: res.status });
    return res.json();
  });
export const usePatchDocument = (id: string) =>
  useProjectMutation(id, ({ did, ...patch }: { did: string } & Partial<Pick<ProjectDoc, "title" | "kind" | "visibleToClient">>) => send(`/api/projects/${id}/documents/${did}`, "PATCH", patch));
export const useDeleteDocument = (id: string) => useProjectMutation(id, (did: string) => send(`/api/projects/${id}/documents/${did}`, "DELETE"));

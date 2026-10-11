"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Project, Stage } from "@/data/types";

const key = ["projects"] as const;

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export function useProjects() {
  return useQuery({ queryKey: key, queryFn: () => fetch("/api/projects").then(json<Project[]>) });
}

export function useMoveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Stage }) =>
      fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      }).then(json<Project>),
    // Actualización optimista: la tarjeta se mueve al instante y se revierte si falla.
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Project[]>(key);
      qc.setQueryData<Project[]>(key, (cur) => cur?.map((p) => (p.id === id ? { ...p, stage } : p)));
      return { previous };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(key, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

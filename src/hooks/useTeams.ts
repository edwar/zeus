"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Team = {
  id: string; name: string; contactName: string; phone: string; email: string | null; city: string; department: string | null;
  lat: number; lon: number; radiusKm: number; maxActive: number | null; installBase: number | null; installPerKwp: number | null;
  active: boolean; notes: string | null; load: number; memberCount: number;
};
export type TeamUser = { id: string; name: string; email: string };
export type TeamDetail = Omit<Team, "load" | "memberCount"> & { members: TeamUser[]; projects: { id: string; name: string; stage: string; town: string }[] };
export type TeamInput = Omit<Team, "id" | "load" | "memberCount"> & { memberIds: string[] };
export const useTeamUsers = () => useQuery({ queryKey: ["team-users"], queryFn: () => fetch("/api/team-users").then(json<TeamUser[]>), staleTime: 60_000 });

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw Object.assign(new Error(String(res.status)), { code: body?.error });
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const useTeams = () => useQuery({ queryKey: ["teams"], queryFn: () => fetch("/api/teams").then(json<Team[]>) });
export const useTeam = (id: string) => useQuery({ queryKey: ["teams", id], enabled: Boolean(id), queryFn: () => fetch(`/api/teams/${id}`).then(json<TeamDetail>) });

export function useSaveTeam(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: TeamInput) =>
      fetch(id ? `/api/teams/${id}` : "/api/teams", { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) }).then(json<{ id: string }>),
    onSettled: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/teams/${id}`, { method: "DELETE" }).then(json<void>),
    onSettled: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });
}

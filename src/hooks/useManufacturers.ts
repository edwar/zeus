"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ManufacturerDto } from "@/lib/products";

const key = ["manufacturers"] as const;

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw Object.assign(new Error(String(res.status)), { status: res.status });
  return res.json();
}

export function useManufacturers() {
  return useQuery({ queryKey: key, queryFn: () => fetch("/api/manufacturers").then(json<ManufacturerDto[]>) });
}

export function useCreateManufacturer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { name: string; website: string | null }) =>
      fetch("/api/manufacturers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) }).then(json<ManufacturerDto>),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteManufacturer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/manufacturers/${id}`, { method: "DELETE" }).then(json<{ ok: true }>),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

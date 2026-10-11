"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { KitInput, KitOption } from "@/lib/kit";

export function useKitOptions(input: Omit<KitInput, "selection">) {
  return useQuery({
    queryKey: ["kit-options", input],
    queryFn: async () => {
      const res = await fetch("/api/simulator/kit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, options: true }) });
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as KitOption[];
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

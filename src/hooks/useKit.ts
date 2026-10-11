"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { KitInput, KitResult } from "@/lib/kit";

export function useKit(input: KitInput) {
  return useQuery({
    queryKey: ["kit", input],
    queryFn: async () => {
      const res = await fetch("/api/simulator/kit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as KitResult;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

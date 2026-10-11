"use client";

import { useQuery } from "@tanstack/react-query";
import { termBucket } from "@/lib/finance/rates-core";

export type FinanceRates = {
  term: number;
  bucket: string;
  usury: { ibcEA: number; usuryEA: number; from: string; to: string; resolution: string } | null;
  market: number | null;
  banks: { name: string; type: string; rateEA: number; credits: number }[];
  cutoff: string | null;
  degraded: boolean;
};

/** Tasas de referencia (datos abiertos de la Superfinanciera) para el plazo elegido. Se agrupa por tramo: no se vuelve a pedir si cambia de 24 a 36 meses. */
export function useFinanceRates(termMonths: number, enabled: boolean) {
  return useQuery({
    queryKey: ["finrates", termBucket(termMonths)],
    enabled,
    staleTime: 30 * 60_000,
    retry: 1,
    queryFn: async () => {
      const res = await fetch(`/api/finance/rates?term=${termMonths}`);
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as FinanceRates;
    },
  });
}

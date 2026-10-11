"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type SyncStep = { runId: string; cursor: number; total: number; done: boolean; created: number; updated: number; failed: number };

export function useCommission() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as { commissionPct: number };
    },
  });
}

export function useSetCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commissionPct: number) => {
      const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commissionPct }) });
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as { commissionPct: number; repriced: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

/** Lanza la sincronización lote a lote (cada POST procesa unos productos) hasta terminar. */
export function useSync() {
  const qc = useQueryClient();
  const [step, setStep] = useState<SyncStep | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(false);
  const stop = useRef(false);

  const start = useCallback(async () => {
    stop.current = false;
    setRunning(true);
    setError(false);
    try {
      for (;;) {
        const res = await fetch("/api/sync", { method: "POST" });
        if (!res.ok) throw new Error(String(res.status));
        const s = (await res.json()) as SyncStep;
        setStep(s);
        if (s.done || stop.current) break;
      }
    } catch {
      setError(true);
    } finally {
      setRunning(false);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["manufacturers"] });
    }
  }, [qc]);

  return { start, step, running, error };
}

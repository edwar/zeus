"use client";

import { useQuery } from "@tanstack/react-query";

/** ¿Hay un equipo que instale en este lugar? Se consulta al servidor (no se publican las ubicaciones de los equipos). */
export function useCoverage(lat: string, lon: string) {
  const la = lat === "" ? NaN : Math.round(Number(lat) * 100) / 100; // ≈1 km, suficiente para decidir y mejora el caché
  const lo = lon === "" ? NaN : Math.round(Number(lon) * 100) / 100;
  const ok = Number.isFinite(la) && Number.isFinite(lo);
  return useQuery({
    queryKey: ["coverage", la, lo],
    enabled: ok,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch("/api/coverage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat: la, lon: lo }) });
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as { covered: boolean };
    },
  });
}

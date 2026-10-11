// Cobertura de instalación: depende de dónde hay equipos operativos (módulo Equipos) y hasta dónde se desplaza cada uno.
// Si ningún equipo cubre el lugar, solo se vende el kit.
export type Fulfillment = "install" | "kit_only" | "unknown";
export const FULFILLMENTS = ["install", "kit_only", "unknown"] as const;
export type InstallerChoice = "zeus" | "own";

export type TeamPoint = { id: string; lat: number; lon: number; radiusKm: number; maxActive: number | null; load: number };

/** Distancia en línea recta (haversine) entre dos puntos, en km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export type Coverage = {
  /** unknown: no hay ubicación. install: algún equipo cubre el lugar. kit_only: ninguno lo cubre. */
  status: Fulfillment;
  /** Equipo sugerido: el más cercano que cubre el lugar y tiene cupo. Puede faltar aunque haya cobertura (todos llenos). */
  teamId: string | null;
  distanceKm: number | null;
  /** Cuántos equipos cubren el lugar (con o sin cupo). */
  covering: number;
};

/**
 * Decide la cobertura de un lugar. La cercanía manda; el cupo (`maxActive`) solo decide cuál se sugiere:
 * si todos los equipos de la zona están llenos sigue habiendo cobertura, pero sin sugerencia (el asesor asigna).
 */
export function coverageFor(teams: TeamPoint[], lat?: number | null, lon?: number | null): Coverage {
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) return { status: "unknown", teamId: null, distanceKm: null, covering: 0 };
  const near = teams
    .map((t) => ({ t, km: distanceKm(t, { lat, lon }) }))
    .filter((x) => x.km <= x.t.radiusKm)
    .sort((a, b) => a.km - b.km);
  if (near.length === 0) return { status: "kit_only", teamId: null, distanceKm: null, covering: 0 };
  const free = near.find((x) => x.t.maxActive == null || x.t.load < x.t.maxActive);
  return { status: "install", teamId: free?.t.id ?? null, distanceKm: Math.round((free ?? near[0]).km), covering: near.length };
}

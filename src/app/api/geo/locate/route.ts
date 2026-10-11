import { z } from "zod";
import { allow, UA, type Located } from "@/lib/geo";

const coords = z.object({ lat: z.coerce.number().min(-90).max(90), lon: z.coerce.number().min(-180).max(180) });

/** Radiación solar de la ubicación (NASA POWER, promedio climatológico) y municipio/departamento (Nominatim). */
async function sunOf(lat: number, lon: number): Promise<Located["sun"]> {
  // La malla de NASA es de ~0,5°: redondear mejora el caché y no cambia el resultado.
  const la = Math.round(lat * 2) / 2;
  const lo = Math.round(lon * 2) / 2;
  const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&latitude=${la}&longitude=${lo}&format=JSON`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000), next: { revalidate: 2_592_000 } }).catch(() => null);
  if (!res?.ok) return null;
  const p = ((await res.json().catch(() => null)) as { properties?: { parameter?: { ALLSKY_SFC_SW_DWN?: Record<string, number> } } } | null)?.properties?.parameter?.ALLSKY_SFC_SW_DWN;
  if (!p) return null;
  const months = Object.entries(p).filter(([k, v]) => k !== "ANN" && v > 0).map(([, v]) => v);
  if (months.length !== 12 || !(p.ANN > 0)) return null;
  const r = (n: number) => Math.round(n * 10) / 10;
  return { annual: r(p.ANN), min: r(Math.min(...months)) };
}

async function placeOf(lat: number, lon: number): Promise<Pick<Located, "municipality" | "department">> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&zoom=10&addressdetails=1&accept-language=es`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000), next: { revalidate: 86_400 } }).catch(() => null);
  const a = res?.ok ? ((await res.json().catch(() => null)) as { address?: Record<string, string> } | null)?.address : null;
  const clean = (s?: string) => s?.replace(/^(Departamento|Municipio) de |Perímetro Urbano  /i, "").slice(0, 80) || null;
  return { municipality: clean(a?.city ?? a?.town ?? a?.village ?? a?.municipality ?? a?.county), department: clean(a?.state) };
}

export async function GET(req: Request) {
  const parsed = coords.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return Response.json({ error: "invalid_coords" }, { status: 400 });
  if (!(await allow(req, "geo-locate", 30, 60))) return Response.json({ error: "rate_limited" }, { status: 429 });
  const { lat, lon } = parsed.data;
  const [sun, place] = await Promise.all([sunOf(lat, lon), placeOf(lat, lon)]);
  return Response.json({ sun, ...place } satisfies Located);
}

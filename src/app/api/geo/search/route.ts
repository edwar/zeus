import { z } from "zod";
import { allow, UA, type Place } from "@/lib/geo";

const q = z.string().trim().min(3).max(100);

/** Busca un lugar en Colombia (Nominatim / OpenStreetMap). Se llama desde el servidor para fijar el User-Agent y limitar el uso. */
export async function GET(req: Request) {
  const parsed = q.safeParse(new URL(req.url).searchParams.get("q"));
  if (!parsed.success) return Response.json({ error: "invalid_query" }, { status: 400 });
  if (!(await allow(req, "geo-search", 30, 60))) return Response.json({ error: "rate_limited" }, { status: 429 });
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({ q: parsed.data, format: "jsonv2", limit: "5", countrycodes: "co", "accept-language": "es" }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000), next: { revalidate: 86_400 } }).catch(() => null);
  if (!res?.ok) return Response.json({ error: "unavailable" }, { status: 502 });
  const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  const places: Place[] = data.map((d) => ({ label: d.display_name, lat: Number(d.lat), lon: Number(d.lon) })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  return Response.json(places);
}

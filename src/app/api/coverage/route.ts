import { z } from "zod";
import { allow } from "@/lib/geo";
import { findCoverage } from "@/lib/teams";
import { tooLarge } from "@/lib/http";

const body = z.object({ lat: z.number().min(-5).max(14), lon: z.number().min(-82).max(-66) });

/**
 * Público: ¿hay un equipo que instale en este lugar? Solo responde sí/no y la distancia al más cercano:
 * no expone dónde están los equipos ni quiénes son.
 */
export async function POST(req: Request) {
  const big = tooLarge(req, 500);
  if (big) return big;
  if (!(await allow(req, "coverage", 60, 60))) return Response.json({ error: "rate_limited" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const c = await findCoverage(parsed.data.lat, parsed.data.lon);
  return Response.json({ covered: c.status === "install" });
}

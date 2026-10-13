import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hitLimit, ipHashOf } from "@/lib/ratelimit";
import { hashShareToken, TOKEN_RE } from "@/lib/quote-share";
import { simulationState } from "@/lib/simulation";

/** Público: devuelve el cálculo guardado para retomarlo en el simulador. Un enlace inválido o vencido responde igual: 404. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/simulations/[token]">) {
  const limit = await hitLimit("simulation-load", ipHashOf(req), 60, 3_600_000);
  if (!limit.ok) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  const { token } = await ctx.params;
  if (!TOKEN_RE.test(token)) return Response.json({ error: "not_found" }, { status: 404 });
  const sim = await prisma.simulation.findUnique({ where: { tokenHash: hashShareToken(token) }, select: { state: true, lang: true, createdAt: true, expiresAt: true } });
  if (!sim || sim.expiresAt.getTime() <= Date.now()) return Response.json({ error: "not_found" }, { status: 404 });
  // El estado se vuelve a validar al leerlo: lo que no cumpla (p. ej. por un cambio futuro) no llega al simulador.
  const state = simulationState.safeParse(sim.state);
  if (!state.success) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ state: state.data, lang: sim.lang, savedAt: sim.createdAt.toISOString(), expiresAt: sim.expiresAt.toISOString() }, { headers: { "Cache-Control": "no-store" } });
}

import { prisma } from "./prisma";
import { type Coverage, type TeamPoint, coverageFor } from "./service-area";

/** Equipos activos con su carga actual (proyectos que aún no han llegado a monitoreo). */
export async function activeTeamPoints(): Promise<TeamPoint[]> {
  const [teams, load] = await Promise.all([
    prisma.team.findMany({ where: { active: true }, select: { id: true, lat: true, lon: true, radiusKm: true, maxActive: true } }),
    prisma.project.groupBy({ by: ["teamId"], where: { teamId: { not: null }, stage: { in: ["lead", "visit", "design", "install"] } }, _count: { _all: true } }),
  ]);
  const byTeam = new Map(load.map((l) => [l.teamId, l._count._all]));
  return teams.map((t) => ({ ...t, load: byTeam.get(t.id) ?? 0 }));
}

export async function findCoverage(lat?: number | null, lon?: number | null): Promise<Coverage> {
  return coverageFor(await activeTeamPoints(), lat, lon);
}

import { z } from "zod";
import { E164 } from "./phone";

const text = (max: number) => z.string().trim().max(max);

export const teamBody = z.object({
  name: text(100).min(2),
  contactName: text(100).min(2),
  phone: z.string().trim().regex(E164),
  email: z.union([z.literal(""), z.email().max(160), z.null()]).optional().transform((v) => v || null),
  city: text(80).min(2),
  department: text(80).nullable().optional().transform((v) => v || null),
  lat: z.number().min(-5).max(14), // Colombia
  lon: z.number().min(-82).max(-66),
  radiusKm: z.number().int().min(5).max(500),
  maxActive: z.number().int().min(1).max(100).nullable().optional().transform((v) => v ?? null),
  installBase: z.number().min(0).max(1e9).nullable().optional().transform((v) => v ?? null),
  installPerKwp: z.number().min(0).max(1e9).nullable().optional().transform((v) => v ?? null),
  memberIds: z.array(z.string().min(1).max(40)).max(50).default([]),
  active: z.boolean().default(true),
  notes: text(1000).nullable().optional().transform((v) => v || null),
});

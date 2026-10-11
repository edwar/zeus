import { z } from "zod";
import type { Project as DbProject } from "@/generated/prisma/client";
import type { Project } from "@/data/types";

export const stageValues = ["lead", "visit", "design", "install", "monitor"] as const;

export function toProjectDto(p: DbProject & { team?: { name: string } | null }): Project {
  return {
    team: p.team?.name ?? null,
    id: p.id,
    name: p.name,
    client: p.client,
    town: p.town,
    kwp: p.kwp,
    stage: p.stage,
    owner: p.owner,
    due: p.due.toISOString().slice(0, 10),
    blocked: p.blocked || undefined,
    progress: p.progress,
  };
}

export const milestoneBody = z.object({
  label: z.string().trim().min(2).max(120),
  startDate: z.iso.date(),
  len: z.number().int().min(1).max(365),
  crew: z.enum(["A", "B", "E"]),
  done: z.number().int().min(0).max(100).optional(),
});

export const alertBody = z.object({
  severity: z.enum(["high", "mid", "low"]),
  message: z.string().trim().min(3).max(300),
});

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:"; // nada de javascript:, data: ni http plano
    } catch {
      return false;
    }
  });

export const monitoringBody = z.object({
  url: z.union([httpsUrl, z.literal(""), z.null()]).transform((v) => v || null),
  note: z.string().trim().max(200).nullable().optional().transform((v) => v || null),
});

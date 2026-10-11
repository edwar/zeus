import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/session";
import { buildSchedule, type SystemType } from "@/lib/schedule-template";

const body = z.object({ lang: z.enum(["es", "en"]).default("es"), start: z.iso.date().optional() });

const DAY = 86_400_000;

/** Crea los hitos de la plantilla según el tipo de sistema y el tamaño. Solo si el proyecto aún no tiene hitos. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApi(req, { perm: "projects.manage" });
  if (denied) return denied;
  const { id } = await ctx.params;
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });

  const p = await prisma.project.findUnique({ where: { id }, include: { quote: { select: { systemType: true } }, _count: { select: { milestones: true } } } });
  if (!p) return Response.json({ error: "not_found" }, { status: 404 });
  if (p._count.milestones > 0) return Response.json({ error: "not_empty" }, { status: 409 });

  const systemType = (["ongrid", "hybrid", "offgrid"].includes(p.quote?.systemType ?? "") ? p.quote!.systemType : "ongrid") as SystemType;
  const start = parsed.data.start ?? new Date().toLocaleDateString("sv-SE");
  // Ni en el pasado lejano ni a más de 2 años: casi seguro es un error de digitación.
  const diff = (Date.parse(`${start}T00:00:00Z`) - Date.now()) / DAY;
  if (diff < -31 || diff > 730) return Response.json({ error: "invalid_start" }, { status: 400 });
  const items = buildSchedule({ systemType, kwp: p.kwp, start, lang: parsed.data.lang });

  // Con la condición de "sin hitos" dentro de la transacción: dos clics seguidos no duplican.
  const created = await prisma.$transaction(async (tx) => {
    if ((await tx.milestone.count({ where: { projectId: id } })) > 0) return 0;
    const r = await tx.milestone.createMany({ data: items.map((m) => ({ projectId: id, labelEs: m.label, labelEn: m.label, startDate: new Date(m.startDate), len: m.len, crew: m.crew })) });
    return r.count;
  });
  return created ? Response.json({ created }, { status: 201 }) : Response.json({ error: "not_empty" }, { status: 409 });
}

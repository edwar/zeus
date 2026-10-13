import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { todayBogota } from "@/lib/crm";
import { followUpSelect, toDate, toFollowUpDto } from "@/lib/crm-server";

const query = z.object({ scope: z.enum(["mine", "all"]).default("mine"), counts: z.enum(["1"]).optional() });

/**
 * Recordatorios pendientes (con los hechos hace poco al final), de un vistazo: vencidos, de hoy y próximos.
 * `counts=1` devuelve solo cuántos tiene vencidos o para hoy quien pregunta (lo usa la insignia del menú).
 */
export async function GET(req: NextRequest) {
  const a = await authorize(req, "quotes");
  if (a.denied) return a.denied;
  const parsed = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return Response.json({ error: "invalid_query" }, { status: 400 });
  const today = todayBogota();
  const mine = { assigneeId: a.userId };

  if (parsed.data.counts) {
    const due = await prisma.followUp.count({ where: { doneAt: null, dueOn: { lte: toDate(today) }, ...mine } });
    return Response.json({ due });
  }
  const who = parsed.data.scope === "mine" ? mine : {};
  const [open, done] = await Promise.all([
    prisma.followUp.findMany({ where: { doneAt: null, ...who }, orderBy: [{ dueOn: "asc" }, { createdAt: "asc" }], take: 300, select: followUpSelect }),
    prisma.followUp.findMany({ where: { doneAt: { not: null }, ...who }, orderBy: { doneAt: "desc" }, take: 10, select: followUpSelect }),
  ]);
  const items = open.map((f) => toFollowUpDto(f, today));
  return Response.json({
    today,
    items,
    done: done.map((f) => toFollowUpDto(f, today)),
    counts: { overdue: items.filter((i) => i.bucket === "overdue").length, today: items.filter((i) => i.bucket === "today").length, upcoming: items.filter((i) => i.bucket === "upcoming").length },
  });
}

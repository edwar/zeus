import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { summarizeBySource } from "@/lib/crm";

const query = z.object({ days: z.enum(["30", "90", "365", "all"]).default("90") });

/** Embudo por origen: cuántas solicitudes llegaron por cada canal y cuántas terminaron aprobadas, en el periodo elegido. */
export async function GET(req: NextRequest) {
  const a = await authorize(req, "quotes");
  if (a.denied) return a.denied;
  const parsed = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return Response.json({ error: "invalid_query" }, { status: 400 });
  const since = parsed.data.days === "all" ? undefined : new Date(Date.now() - Number(parsed.data.days) * 86_400_000);
  const when = since ? { createdAt: { gte: since } } : {};
  const [quotes, leads] = await Promise.all([
    prisma.quoteRequest.groupBy({ by: ["source", "status"], where: when, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["source"], where: { status: "open", ...when }, _count: { _all: true } }),
  ]);
  const rows = summarizeBySource(quotes.map((q) => ({ source: q.source, status: q.status, n: q._count._all })), leads.map((l) => ({ source: l.source, n: l._count._all })));
  return Response.json({ days: parsed.data.days, rows });
}

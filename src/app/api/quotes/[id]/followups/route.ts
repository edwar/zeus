import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { followUpBody } from "@/lib/crm";
import { resolveAssignee, toDate } from "@/lib/crm-server";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/quotes/[id]/followups">) {
  const big = tooLarge(req, 5_000);
  if (big) return big;
  const a = await authorize(req, "quotes");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const parsed = followUpBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const quote = await prisma.quoteRequest.findUnique({ where: { id }, select: { status: true } });
  if (!quote) return Response.json({ error: "not_found" }, { status: 404 });
  const who = await resolveAssignee(parsed.data.assigneeId, a);
  if (!who) return Response.json({ error: "unknown_assignee" }, { status: 400 });
  const f = await prisma.followUp.create({ data: { quoteId: id, dueOn: toDate(parsed.data.dueOn), note: parsed.data.note, assigneeId: who.id, assigneeName: who.name, createdBy: a.name }, select: { id: true } });
  return Response.json({ id: f.id }, { status: 201 });
}

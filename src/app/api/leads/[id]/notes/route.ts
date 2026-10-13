import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { noteBody } from "@/lib/crm";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/leads/[id]/notes">) {
  const big = tooLarge(req, 5_000);
  if (big) return big;
  const a = await authorize(req, "quotes");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const parsed = noteBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  if (!(await prisma.lead.count({ where: { id } }))) return Response.json({ error: "not_found" }, { status: 404 });
  const n = await prisma.leadNote.create({ data: { leadId: id, body: parsed.data.body, userName: a.name }, select: { id: true } });
  return Response.json({ id: n.id }, { status: 201 });
}

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { followUpPatch } from "@/lib/crm";
import { toDate } from "@/lib/crm-server";

/** Marca un recordatorio como hecho (o lo reabre), o le cambia la fecha o el texto. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/followups/[id]">) {
  const big = tooLarge(req, 5_000);
  if (big) return big;
  const a = await authorize(req, "quotes");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const parsed = followUpPatch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const b = parsed.data;
  const r = await prisma.followUp.updateMany({
    where: { id },
    data: {
      ...(b.dueOn && { dueOn: toDate(b.dueOn) }),
      ...(b.note && { note: b.note }),
      ...(b.done === true && { doneAt: new Date(), doneBy: a.name }),
      ...(b.done === false && { doneAt: null, doneBy: null }),
    },
  });
  return r.count ? Response.json({ id }) : Response.json({ error: "not_found" }, { status: 404 });
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/followups/[id]">) {
  const a = await authorize(req, "quotes");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const r = await prisma.followUp.deleteMany({ where: { id } });
  return r.count ? new Response(null, { status: 204 }) : Response.json({ error: "not_found" }, { status: 404 });
}

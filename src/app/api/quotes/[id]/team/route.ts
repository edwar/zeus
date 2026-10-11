import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { guardApi } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { kitEditable } from "@/lib/quote-flow";

const body = z.object({ teamId: z.string().min(1).max(40).nullable() });

/** El asesor asigna (o quita) el equipo que hará la visita y la instalación. Solo mientras la solicitud sigue abierta. */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApi(req, { perm: "quotes" });
  if (denied) return denied;
  const big = tooLarge(req, 1_000);
  if (big) return big;
  const session = await auth.api.getSession({ headers: req.headers });
  const { id } = await ctx.params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const { teamId } = parsed.data;

  const current = await prisma.quoteRequest.findUnique({ where: { id }, select: { status: true, teamId: true, team: { select: { name: true } } } });
  if (!current) return Response.json({ error: "not_found" }, { status: 404 });
  if (!kitEditable(current.status)) return Response.json({ error: "locked" }, { status: 409 });
  if (current.teamId === teamId) return Response.json({ id, changed: false });

  const next = teamId ? await prisma.team.findFirst({ where: { id: teamId, active: true }, select: { name: true } }) : null;
  if (teamId && !next) return Response.json({ error: "unknown_team" }, { status: 400 });

  const done = await prisma.$transaction(async (tx) => {
    const r = await tx.quoteRequest.updateMany({ where: { id, status: current.status, teamId: current.teamId }, data: { teamId } });
    if (r.count === 0) return false;
    await tx.quoteEvent.create({
      data: { quoteId: id, fromStatus: current.status, toStatus: current.status, subject: "team", note: `${current.team?.name ?? "—"} → ${next?.name ?? "—"}`, userName: session?.user.name ?? "—" },
    });
    return true;
  });
  return done ? Response.json({ id, changed: true }) : Response.json({ error: "conflict" }, { status: 409 });
}

import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { adjustStock, receiveStock } from "@/lib/stock";
import { stockErrorResponse } from "@/lib/stock-http";

const body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("purchase"), qty: z.number().int().min(1).max(1_000_000), unitCost: z.number().min(0).max(1_000_000_000), note: z.string().trim().max(300).nullable().default(null) }),
  // Conteo físico: la cantidad real que hay en bodega. El motivo es obligatorio: es lo que permite cuadrar diferencias después.
  z.object({ kind: z.literal("adjust"), counted: z.number().int().min(0).max(1_000_000), note: z.string().trim().min(3).max(300) }),
]);

/** Últimos movimientos de un producto (nunca se editan ni se borran). */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/stock/[productId]/moves">) {
  const a = await authorize(req, "stock");
  if (a.denied) return a.denied;
  const { productId } = await ctx.params;
  const rows = await prisma.stockMove.findMany({ where: { productId }, orderBy: { createdAt: "desc" }, take: 100 });
  const projects = await prisma.project.findMany({ where: { id: { in: rows.map((r) => r.projectId).filter((x): x is string => !!x) } }, select: { id: true, name: true, client: true } });
  const byId = new Map(projects.map((p) => [p.id, p]));
  return Response.json(rows.map((r) => ({
    id: r.id, kind: r.kind, qty: r.qty, unitCost: r.unitCost == null ? null : Number(r.unitCost), balance: r.balance, note: r.note, userName: r.userName, createdAt: r.createdAt.toISOString(),
    project: r.projectId ? { id: r.projectId, name: byId.get(r.projectId)?.name ?? null, client: byId.get(r.projectId)?.client ?? null } : null,
  })));
}

/** Registra una entrada por compra o un conteo físico. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/stock/[productId]/moves">) {
  const big = tooLarge(req, 2_000);
  if (big) return big;
  const a = await authorize(req, "stock");
  if (a.denied) return a.denied;
  const { productId } = await ctx.params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  try {
    if (parsed.data.kind === "purchase") await receiveStock(productId, parsed.data, a.name);
    else await adjustStock(productId, parsed.data, a.name);
  } catch (e) {
    return stockErrorResponse(e);
  }
  return Response.json({ ok: true }, { status: 201 });
}

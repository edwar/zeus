import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { projectMargin } from "@/lib/stock-core";

/** Margen del kit de un proyecto (venta menos costo). Solo quien ve costos; el equipo de instalación no recibe nada. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/projects/[id]/margin">) {
  const a = await authorize(req, "stock");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const mats = await prisma.material.findMany({ where: { projectId: id }, select: { qty: true, unitPrice: true, unitCost: true, source: true, stockQty: true, productId: true } });
  if (!(await prisma.project.findUnique({ where: { id }, select: { id: true } }))) return Response.json({ error: "not_found" }, { status: 404 });
  // Sin descontar todavía, lo que sale del inventario se estima con el costo promedio de hoy.
  const items = await prisma.stockItem.findMany({ where: { productId: { in: mats.map((m) => m.productId).filter((x): x is string => !!x) } }, select: { productId: true, avgCost: true } });
  const avg = new Map(items.map((i) => [i.productId, i.avgCost == null ? null : Number(i.avgCost)]));
  const lines = mats.map((m) => ({
    qty: m.qty,
    unitPrice: m.unitPrice == null ? null : Number(m.unitPrice),
    unitCost: m.source === "stock" && m.stockQty === 0 && m.productId ? avg.get(m.productId) ?? null : m.unitCost == null ? null : Number(m.unitCost),
  }));
  return Response.json({ ...projectMargin(lines), estimated: mats.some((m) => m.source === "stock" && m.stockQty === 0) });
}

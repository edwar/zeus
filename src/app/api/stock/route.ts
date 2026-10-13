import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { enableStock } from "@/lib/stock";
import { stockErrorResponse } from "@/lib/stock-http";
import { isLow } from "@/lib/stock-core";

const create = z.object({
  productId: z.string().min(1).max(40),
  onHand: z.number().int().min(0).max(1_000_000),
  unitCost: z.number().min(0).max(1_000_000_000).nullable(),
  minQty: z.number().int().min(0).max(1_000_000),
});

/** Productos con inventario propio, con su costo promedio. Solo quien maneja el inventario: el costo es información interna. */
export async function GET(req: NextRequest) {
  const a = await authorize(req, "stock");
  if (a.denied) return a.denied;
  const rows = await prisma.stockItem.findMany({
    include: { product: { select: { id: true, name: true, sku: true, source: true, inStock: true, supplierPrice: true, price: true, manufacturer: { select: { name: true } } } } },
    orderBy: { product: { name: "asc" } },
  });
  const committed = await prisma.material.groupBy({ by: ["productId"], where: { source: "stock", stockQty: 0, productId: { in: rows.map((r) => r.productId) }, project: { stage: { not: "monitor" } } }, _sum: { qty: true } });
  const reserved = new Map(committed.map((c) => [c.productId, c._sum.qty ?? 0]));
  return Response.json(rows.map((r) => ({
    productId: r.productId, name: r.product.name, sku: r.product.sku, manufacturer: r.product.manufacturer.name, source: r.product.source,
    onHand: r.onHand, minQty: r.minQty, low: isLow(r.onHand, r.minQty), avgCost: r.avgCost == null ? null : Number(r.avgCost),
    supplierPrice: r.product.supplierPrice == null ? null : Number(r.product.supplierPrice), price: Number(r.product.price),
    // Lo que ya está pedido de este producto por proyectos en curso y todavía no se descontó
    pending: reserved.get(r.productId) ?? 0,
  })));
}

/** Empieza a llevar inventario de un producto. */
export async function POST(req: NextRequest) {
  const big = tooLarge(req, 2_000);
  if (big) return big;
  const a = await authorize(req, "stock");
  if (a.denied) return a.denied;
  const parsed = create.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  try {
    await enableStock(parsed.data.productId, parsed.data, a.name);
  } catch (e) {
    return stockErrorResponse(e);
  }
  return Response.json({ productId: parsed.data.productId }, { status: 201 });
}

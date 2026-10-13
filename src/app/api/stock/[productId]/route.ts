import type { NextRequest } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/session";
import { disableStock, setMinQty } from "@/lib/stock";
import { stockErrorResponse } from "@/lib/stock-http";

/** Cambia el mínimo (la alerta de stock bajo). */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/stock/[productId]">) {
  const a = await authorize(req, "stock");
  if (a.denied) return a.denied;
  const { productId } = await ctx.params;
  const parsed = z.object({ minQty: z.number().int().min(0).max(1_000_000) }).strict().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  try {
    await setMinQty(productId, parsed.data.minQty);
  } catch (e) {
    return stockErrorResponse(e);
  }
  return new Response(null, { status: 204 });
}

/** Deja de llevar inventario del producto (el historial de movimientos se conserva). */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/stock/[productId]">) {
  const a = await authorize(req, "stock");
  if (a.denied) return a.denied;
  const { productId } = await ctx.params;
  try {
    await disableStock(productId);
  } catch (e) {
    return stockErrorResponse(e);
  }
  return new Response(null, { status: 204 });
}

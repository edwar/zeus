import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { guardApi } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { KIT_KINDS, kitEditable } from "@/lib/quote-flow";

const body = z.object({
  items: z.array(z.object({ productId: z.string().min(1).max(40), qty: z.number().int().min(1).max(9999) })).min(1).max(30),
});

/** El asesor ajusta el kit mientras habla con el cliente. Los precios salen del catálogo, no del navegador. */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApi(req, { perm: "quotes" });
  if (denied) return denied;
  const big = tooLarge(req, 10_000);
  if (big) return big;
  const session = await auth.api.getSession({ headers: req.headers });
  const { id } = await ctx.params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });

  const qty = new Map<string, number>();
  for (const i of parsed.data.items) qty.set(i.productId, (qty.get(i.productId) ?? 0) + i.qty);

  const current = await prisma.quoteRequest.findUnique({ where: { id }, include: { items: true } });
  if (!current) return Response.json({ error: "not_found" }, { status: 404 });
  if (!kitEditable(current.status)) return Response.json({ error: "locked" }, { status: 409 });

  // Las líneas que ya estaban conservan su precio cotizado si el producto sigue activo; las nuevas toman el precio vigente.
  const products = await prisma.product.findMany({ where: { id: { in: [...qty.keys()] }, active: true, price: { gt: 0 }, kind: { in: [...KIT_KINDS] } } });
  if (products.length !== qty.size) return Response.json({ error: "unknown_product" }, { status: 400 });
  const before = new Map(current.items.filter((i) => i.productId).map((i) => [i.productId!, i]));
  const next = products.map((p) => {
    const old = before.get(p.id);
    return { productId: p.id, kind: p.kind, nameSnapshot: old?.nameSnapshot ?? p.name, unitPrice: old?.unitPrice ?? p.price, qty: qty.get(p.id)! };
  });
  const total = next.reduce((n, i) => n + Number(i.unitPrice) * i.qty, 0);

  // Resumen legible de lo que cambió, para el historial.
  const changes: string[] = [];
  for (const n of next) {
    const old = before.get(n.productId);
    if (!old) changes.push(`+ ${n.nameSnapshot} ×${n.qty}`);
    else if (old.qty !== n.qty) changes.push(`${n.nameSnapshot}: ${old.qty} → ${n.qty}`);
  }
  for (const [pid, old] of before) if (!qty.has(pid)) changes.push(`− ${old.nameSnapshot}`);
  for (const old of current.items) if (!old.productId) changes.push(`− ${old.nameSnapshot}`);
  if (changes.length === 0) return Response.json({ id, total: Number(current.total), changed: false });

  const snapshot = current.items.map((i) => ({ productId: i.productId, kind: i.kind, name: i.nameSnapshot, unitPrice: Number(i.unitPrice), qty: i.qty }));
  const done = await prisma.$transaction(async (tx) => {
    // Con el estado esperado: si alguien aprueba a la vez, la edición no se aplica.
    const r = await tx.quoteRequest.updateMany({
      where: { id, status: current.status },
      data: { total, ...(current.originalItems == null && { originalItems: snapshot, originalTotal: current.total }) },
    });
    if (r.count === 0) return false;
    await tx.quoteItem.deleteMany({ where: { quoteId: id } });
    await tx.quoteItem.createMany({ data: next.map((i) => ({ ...i, quoteId: id })) });
    await tx.quoteEvent.create({
      data: { quoteId: id, fromStatus: current.status, toStatus: current.status, kitChange: true, note: changes.join("\n").slice(0, 1000), userName: session?.user.name ?? "—" },
    });
    return true;
  });
  if (!done) return Response.json({ error: "conflict" }, { status: 409 });
  return Response.json({ id, total, changed: true });
}

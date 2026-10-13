import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { expireCatalog } from "@/lib/catalog-cache";
import { weightedAvg } from "@/lib/stock-core";

type Tx = Prisma.TransactionClient;
const num = (d: Prisma.Decimal | null | undefined) => (d == null ? null : Number(d));

export class StockError extends Error {
  constructor(public code: "not_tracked" | "already_tracked" | "has_projects" | "not_found" | "no_change") {
    super(code);
  }
}

/** Empieza a llevar inventario de un producto, con lo que hay hoy (puede ser 0). */
export async function enableStock(productId: string, v: { onHand: number; unitCost: number | null; minQty: number }, userName: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new StockError("not_found");
  if (await prisma.stockItem.findUnique({ where: { productId }, select: { productId: true } })) throw new StockError("already_tracked");
  await prisma.$transaction(async (tx) => {
    await tx.stockItem.create({ data: { productId, onHand: v.onHand, minQty: v.minQty, avgCost: v.unitCost } });
    await tx.stockMove.create({ data: { productId, kind: "adjust", qty: v.onHand, unitCost: v.unitCost, balance: v.onHand, note: "initial", userName } });
  });
  expireCatalog();
}

/** Deja de llevar inventario. No se puede si algún proyecto tiene unidades descontadas de este producto. */
export async function disableStock(productId: string) {
  if (await prisma.material.count({ where: { productId, stockQty: { gt: 0 } } })) throw new StockError("has_projects");
  const r = await prisma.stockItem.deleteMany({ where: { productId } });
  if (!r.count) throw new StockError("not_tracked");
  await prisma.material.updateMany({ where: { productId, source: "stock" }, data: { source: "supplier" } });
  expireCatalog();
}

/** Entrada por compra: suma unidades y recalcula el costo promedio. */
export async function receiveStock(productId: string, v: { qty: number; unitCost: number; note: string | null }, userName: string) {
  await prisma.$transaction(async (tx) => {
    const item = await tx.stockItem.findUnique({ where: { productId } });
    if (!item) throw new StockError("not_tracked");
    const avg = weightedAvg(item.onHand, num(item.avgCost), v.qty, v.unitCost);
    const updated = await tx.stockItem.update({ where: { productId }, data: { onHand: { increment: v.qty }, avgCost: avg } });
    await tx.stockMove.create({ data: { productId, kind: "purchase", qty: v.qty, unitCost: v.unitCost, balance: updated.onHand, note: v.note, userName } });
  });
  expireCatalog();
}

/** Conteo físico: fija las existencias reales y deja la diferencia anotada con su motivo. */
export async function adjustStock(productId: string, v: { counted: number; note: string }, userName: string) {
  await prisma.$transaction(async (tx) => {
    const item = await tx.stockItem.findUnique({ where: { productId } });
    if (!item) throw new StockError("not_tracked");
    const diff = v.counted - item.onHand;
    if (diff === 0) throw new StockError("no_change");
    const updated = await tx.stockItem.update({ where: { productId }, data: { onHand: v.counted } });
    await tx.stockMove.create({ data: { productId, kind: "adjust", qty: diff, unitCost: num(item.avgCost), balance: updated.onHand, note: v.note, userName } });
  });
  expireCatalog();
}

export async function setMinQty(productId: string, minQty: number) {
  const r = await prisma.stockItem.updateMany({ where: { productId }, data: { minQty } });
  if (!r.count) throw new StockError("not_tracked");
}

/**
 * Deja el inventario de un material en el estado que le corresponde: descontado si está listo y sale del inventario propio;
 * sin descontar en cualquier otro caso. Es idempotente: solo mueve la diferencia, y si dos personas lo marcan a la vez
 * solo una descuenta (el `where` exige la cantidad que se leyó).
 */
export async function syncMaterialStock(materialId: string, userName: string): Promise<void> {
  const changed = await prisma.$transaction(async (tx) => {
    const m = await tx.material.findUnique({ where: { id: materialId } });
    if (!m) return false;
    const target = m.ready && m.source === "stock" && m.productId ? m.qty : 0;
    const delta = target - m.stockQty;
    if (delta === 0 || !m.productId) return false;
    const item = await tx.stockItem.findUnique({ where: { productId: m.productId } });
    if (!item) return false; // dejó de llevarse inventario: no hay de dónde descontar
    const claimed = await tx.material.updateMany({
      where: { id: m.id, stockQty: m.stockQty },
      data: { stockQty: target, ...(delta > 0 && { unitCost: item.avgCost }) },
    });
    if (!claimed.count) return false;
    const updated = await tx.stockItem.update({ where: { productId: m.productId }, data: { onHand: { decrement: delta } } });
    await tx.stockMove.create({
      data: { productId: m.productId, kind: delta > 0 ? "project" : "return", qty: -delta, unitCost: num(item.avgCost), balance: updated.onHand, projectId: m.projectId, materialId: m.id, userName },
    });
    return true;
  });
  if (changed) expireCatalog();
}

export async function syncProjectStock(projectId: string, userName: string) {
  const ids = await prisma.material.findMany({ where: { projectId }, select: { id: true } });
  for (const m of ids) await syncMaterialStock(m.id, userName);
}

/** Cambia de dónde sale un material (inventario propio o proveedor) y ajusta el inventario en consecuencia. */
export async function setMaterialSource(projectId: string, materialId: string, source: "stock" | "supplier", userName: string) {
  const m = await prisma.material.findFirst({ where: { id: materialId, projectId }, select: { productId: true, source: true } });
  if (!m) throw new StockError("not_found");
  if (m.source === source) return;
  const item = m.productId ? await prisma.stockItem.findUnique({ where: { productId: m.productId }, select: { avgCost: true } }) : null;
  if (source === "stock" && !item) throw new StockError("not_tracked");
  // El costo de referencia sigue al origen: promedio del inventario, o precio actual del proveedor.
  const supplier = source === "supplier" && m.productId ? await prisma.product.findUnique({ where: { id: m.productId }, select: { supplierPrice: true } }) : null;
  await prisma.material.update({ where: { id: materialId }, data: { source, unitCost: source === "stock" ? item!.avgCost : supplier?.supplierPrice ?? null } });
  await syncMaterialStock(materialId, userName);
}

/** Datos con los que nace un material al aprobar la solicitud: origen y precio/costo congelados. */
export async function materialSeed(tx: Tx, items: { productId: string | null; qty: number; unitPrice: Prisma.Decimal }[]) {
  const ids = [...new Set(items.map((i) => i.productId).filter((x): x is string => !!x))];
  const products = ids.length ? await tx.product.findMany({ where: { id: { in: ids } }, select: { id: true, supplierPrice: true, stock: { select: { onHand: true, avgCost: true } } } }) : [];
  const byId = new Map(products.map((p) => [p.id, p]));
  return items.map((i) => {
    const p = i.productId ? byId.get(i.productId) : undefined;
    const fromStock = !!p?.stock && p.stock.onHand >= i.qty;
    return {
      productId: i.productId,
      unitPrice: i.unitPrice,
      source: fromStock ? "stock" : "supplier",
      // Del proveedor: su precio al aprobar. Del inventario: el costo promedio actual (se vuelve a fijar al descontar).
      unitCost: fromStock ? p!.stock!.avgCost : p?.supplierPrice ?? null,
    };
  });
}


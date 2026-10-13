/** Reglas puras del inventario (sin base de datos): costo promedio, alertas y margen. */

/** Costo promedio ponderado tras una entrada. Sin existencias (o con existencias negativas) el costo nuevo manda. */
export function weightedAvg(onHand: number, avg: number | null, qty: number, unitCost: number): number {
  if (onHand <= 0 || avg == null) return round2(unitCost);
  return round2((onHand * avg + qty * unitCost) / (onHand + qty));
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Stock bajo: en o por debajo del mínimo (incluye agotado y negativo). Sin mínimo definido, solo avisa si se agotó. */
export const isLow = (onHand: number, minQty: number) => onHand <= Math.max(0, minQty);

/**
 * ¿Se puede ofrecer el producto? Si lo llevas en inventario y hay unidades, sí. Si no hay: un producto del proveedor
 * depende de que el proveedor lo tenga; uno manual (que solo existe en tu bodega) se agota.
 */
export function effectiveInStock(p: { source: string; inStock: boolean }, onHand: number | null): boolean {
  if (onHand != null && onHand > 0) return true;
  if (onHand != null && p.source !== "autosolar") return false;
  return p.inStock;
}

export type MarginLine = { qty: number; unitPrice: number | null; unitCost: number | null };
export type Margin = { revenue: number; cost: number; margin: number; pct: number | null; incomplete: boolean };

/** Margen del kit de un proyecto. Si a algún material le falta precio o costo, se calcula con el resto y se marca incompleto. */
export function projectMargin(lines: MarginLine[]): Margin {
  let revenue = 0;
  let cost = 0;
  let incomplete = lines.length === 0;
  for (const l of lines) {
    if (l.unitPrice == null || l.unitCost == null) { incomplete = true; continue; }
    revenue += l.unitPrice * l.qty;
    cost += l.unitCost * l.qty;
  }
  const margin = round2(revenue - cost);
  return { revenue: round2(revenue), cost: round2(cost), margin, pct: revenue > 0 ? Math.round((margin / revenue) * 1000) / 10 : null, incomplete };
}

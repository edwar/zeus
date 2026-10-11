/** Los precios de venta se redondean a este múltiplo (COP). */
export const ROUND_TO = 100;

/** Precio de venta = precio del proveedor + comisión, redondeado. */
export function salePrice(supplierPrice: number, commissionPct: number): number {
  const raw = supplierPrice * (1 + commissionPct / 100);
  return Math.round(raw / ROUND_TO) * ROUND_TO;
}

/** La comisión propia del producto manda; si no tiene, aplica la global. */
export function effectiveCommission(own: number | null | undefined, global: number): number {
  return own ?? global;
}

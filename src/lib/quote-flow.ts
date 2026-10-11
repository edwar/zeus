/** Flujo de una solicitud. Se usa en el servidor (validar) y en la interfaz (qué botones mostrar). */
export const QUOTE_STATUSES = ["new", "contacted", "confirmed", "approved", "discarded"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

/**
 * new → contacted (el agente habló con el cliente) → confirmed (el cálculo quedó validado con él)
 * → approved (el cliente aceptó la cotización). Se puede descartar antes de aprobar y reabrir lo descartado.
 * `approved` es final: de ahí nace el proyecto.
 */
export const TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  new: ["contacted", "discarded"],
  contacted: ["confirmed", "discarded"],
  confirmed: ["approved", "contacted", "discarded"],
  approved: [],
  discarded: ["contacted"],
};

export const canMove = (from: QuoteStatus, to: QuoteStatus) => TRANSITIONS[from].includes(to);
/** Estados que exigen explicar el motivo. */
export const needsNote = (to: QuoteStatus) => to === "discarded";

/** El kit solo se puede ajustar mientras la solicitud sigue abierta; al aprobar queda congelado. */
export const kitEditable = (s: QuoteStatus) => s === "new" || s === "contacted" || s === "confirmed";

/** Tipos de producto que pueden ir en un kit. */
export const KIT_KINDS = ["panel", "inverter_ongrid", "inverter_hybrid", "battery", "structure", "cable_dc", "connector", "terminal", "battery_cable", "cabinet", "rack_tray", "monitoring", "electrical_kit"] as const;
export type KitKind = (typeof KIT_KINDS)[number];

/** Clases de eficiencia de la etiqueta energética, de la más eficiente (A) a la menos (G). */
export const CLASSES = ["A", "B", "C", "D", "E", "F", "G"] as const;
export type EnergyClass = (typeof CLASSES)[number];

/** Cuánto consume cada clase respecto a la D (la de referencia de la tabla de abajo). */
export const CLASS_FACTOR: Record<EnergyClass, number> = { A: 0.5, B: 0.65, C: 0.8, D: 1, E: 1.2, F: 1.45, G: 1.75 };

/**
 * Consumo mensual típico de una unidad en clase D, con un uso medio de hogar (kWh/mes). Es una estimación:
 * quien tenga la etiqueta puede escribir su consumo real y reemplaza este valor.
 * `labeled`: los equipos que llevan etiqueta con clase; los demás se calculan sin ella.
 */
export const APPLIANCES = [
  { id: "fridge", kwhD: 45, labeled: true }, // funciona todo el día
  { id: "freezer", kwhD: 40, labeled: true },
  { id: "washer", kwhD: 12, labeled: true }, // ~3 cargas por semana
  { id: "dryer", kwhD: 35, labeled: true },
  { id: "dishwasher", kwhD: 25, labeled: true },
  { id: "ac", kwhD: 150, labeled: true }, // ~1 kW × 5 h al día
  { id: "tv", kwhD: 18, labeled: true }, // ~120 W × 5 h al día
  { id: "bulb", kwhD: 1.5, labeled: true }, // LED de 9 W × 5 h al día
  { id: "waterHeater", kwhD: 60, labeled: false },
  { id: "microwave", kwhD: 8, labeled: false },
  { id: "oven", kwhD: 20, labeled: false },
  { id: "fan", kwhD: 11, labeled: false },
  { id: "computer", kwhD: 25, labeled: false },
  { id: "iron", kwhD: 6, labeled: false },
] as const;
export type ApplianceId = (typeof APPLIANCES)[number]["id"];

/** Una fila del formulario (todo como texto, tal como se escribe). */
export type ApplianceRow = {
  id: string; // para la lista en pantalla
  appliance: ApplianceId;
  qty: string;
  cls: EnergyClass;
  label: string; // kWh/mes por unidad leídos de la etiqueta; si se escribe, reemplaza la tabla
};

export const MAX_QTY = 99;

const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));
const find = (id: string) => APPLIANCES.find((a) => a.id === id);

/** Un equipo por fila: el id de la fila es el del equipo (nada aleatorio al renderizar, así servidor y navegador coinciden). */
export const newRow = (appliance: ApplianceId): ApplianceRow => ({
  id: appliance,
  appliance,
  qty: "1",
  cls: "D",
  label: "",
});

export const isLabeled = (id: string) => find(id)?.labeled ?? false;

/** kWh/mes de una unidad: lo de la etiqueta si se escribió; si no, la tabla ajustada por clase. */
export function unitKwh(r: ApplianceRow): number {
  const fromLabel = num(r.label);
  if (fromLabel > 0) return fromLabel;
  const a = find(r.appliance);
  if (!a) return 0;
  return a.kwhD * (a.labeled ? CLASS_FACTOR[r.cls] : 1);
}

/** Una fila cuenta solo si tiene una cantidad entera válida (el selector de cantidad no deja otra). */
export const rowQty = (r: ApplianceRow): number => {
  const q = num(r.qty);
  return Number.isInteger(q) && q > 0 && q <= MAX_QTY ? q : 0;
};

export const rowKwh = (r: ApplianceRow): number => unitKwh(r) * rowQty(r);

export const totalKwh = (rows: ApplianceRow[]): number => rows.reduce((n, r) => n + rowKwh(r), 0);

/** Filas con cantidad o consumo de etiqueta mal escritos: se avisa en vez de ignorarlas en silencio. */
export const invalidRows = (rows: ApplianceRow[]): Set<string> =>
  new Set(rows.filter((r) => rowQty(r) === 0 || (r.label.trim() !== "" && !(num(r.label) > 0))).map((r) => r.id));

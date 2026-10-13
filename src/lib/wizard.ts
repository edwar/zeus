import type { BillData } from "./ai/bill";
import { baseMonthlyKwh, hasBattery, size, type Sizing, type SystemType } from "./sizing";
import type { KitInput } from "./kit";

/** Valores del formulario de revisión (todo como texto, tal como se escribe). */
export type ReviewValues = {
  operator: string;
  department: string;
  municipality: string;
  lat: string; // ubicación elegida en el mapa (aprox.)
  lon: string;
  sunAnnual: string; // horas sol pico del lugar: promedio anual y mes más bajo
  sunMin: string;
  estrato: string; // "" | "1".."6"
  connection: "" | "single_phase" | "two_phase" | "three_phase";
  monthlyKwh: string;
  tariff: string;
  coveragePct: string;
  peakSunHours: string;
  systemType: SystemType;
  backupKw: string;
  autonomyHours: string;
};

export type FieldSource = "bill" | "check" | "missing" | "derived";
export type Sources = Partial<Record<"monthlyKwh" | "tariff" | "connection" | "location", FieldSource>>;

export const DEFAULTS = { coveragePct: "100", peakSunHours: "4.5" };

export const emptyValues = (): ReviewValues => ({
  operator: "", department: "", municipality: "", lat: "", lon: "", sunAnnual: "", sunMin: "", estrato: "", connection: "",
  monthlyKwh: "", tariff: "", coveragePct: DEFAULTS.coveragePct, peakSunHours: DEFAULTS.peakSunHours,
  systemType: "ongrid", backupKw: "", autonomyHours: "",
});

const str = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? "" : String(Math.round(n * 10 ** d) / 10 ** d));
const src = (value: unknown, c: "high" | "medium" | "low"): FieldSource => (value == null || value === "" ? "missing" : c === "high" ? "bill" : "check");

/** Convierte lo leído por la IA en valores editables y marca de dónde viene cada dato. */
export function valuesFromBill(b: BillData): { values: ReviewValues; sources: Sources } {
  const monthly = baseMonthlyKwh(b.consumptionKwh, b.history);
  let tariff = b.unitPrice;
  let tariffSource: FieldSource = src(tariff, b.confidence.unitPrice);
  if (tariff == null && b.energyChargeAmount && b.consumptionKwh) {
    tariff = b.energyChargeAmount / b.consumptionKwh; // tarifa implícita: se marca como derivada para que el usuario la revise
    tariffSource = "derived";
  }
  const values: ReviewValues = {
    ...emptyValues(),
    operator: b.operator ?? "",
    department: b.department ?? "",
    municipality: b.municipality ?? "",
    estrato: b.estrato ? String(b.estrato) : "",
    connection: b.connection ?? "",
    monthlyKwh: str(monthly, 1),
    tariff: str(tariff, 2),
  };
  return {
    values,
    sources: {
      monthlyKwh: src(monthly, b.confidence.consumption),
      tariff: tariffSource,
      connection: src(b.connection, b.confidence.connection),
      location: src(b.municipality ?? b.department, b.confidence.location),
    },
  };
}

const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));

export const phasesOf = (c: ReviewValues["connection"]): 1 | 2 | 3 | null =>
  c === "single_phase" ? 1 : c === "two_phase" ? 2 : c === "three_phase" ? 3 : null;

export type ReviewErrors = Partial<Record<"monthlyKwh" | "tariff" | "coveragePct" | "peakSunHours" | "backupKw" | "autonomyHours", true>>;

export function validate(v: ReviewValues): ReviewErrors {
  const e: ReviewErrors = {};
  const kwh = num(v.monthlyKwh);
  if (!(kwh > 0 && kwh <= 100_000)) e.monthlyKwh = true;
  if (v.tariff.trim() !== "" && !(num(v.tariff) > 0)) e.tariff = true;
  const cov = num(v.coveragePct);
  if (!(cov >= 1 && cov <= 100)) e.coveragePct = true;
  const sun = num(v.peakSunHours);
  if (!(sun >= 1 && sun <= 9)) e.peakSunHours = true;
  if (hasBattery(v.systemType)) {
    const kw = num(v.backupKw);
    if (!(kw > 0 && kw <= 100)) e.backupKw = true;
    const h = num(v.autonomyHours);
    if (!(h > 0 && h <= 72)) e.autonomyHours = true;
  }
  return e;
}

export function sizingOf(v: ReviewValues): Sizing | null {
  if (Object.keys(validate(v)).length) return null;
  const tariff = num(v.tariff);
  return size({
    monthlyKwh: num(v.monthlyKwh),
    coveragePct: num(v.coveragePct),
    peakSunHours: num(v.peakSunHours),
    systemType: v.systemType,
    tariff: Number.isFinite(tariff) && tariff > 0 ? tariff : null,
    backupLoadKw: hasBattery(v.systemType) ? num(v.backupKw) : undefined,
    autonomyHours: hasBattery(v.systemType) ? num(v.autonomyHours) : undefined,
  });
}

/** Horas sol pico a usar: el aislado debe funcionar todo el año, así que toma el mes más bajo; los demás, el promedio. */
export const sunFor = (type: SystemType, annual: string, min: string): string | null => {
  const v = type === "offgrid" && min ? min : annual;
  return v || null;
};

/** Lo que pide el simulador de kits para una potencia dada: se comparte entre el kit elegido y los escenarios (así comparten caché). */
export const kitBaseOf = (v: ReviewValues, sizing: Sizing): Omit<KitInput, "selection"> => ({
  systemType: v.systemType,
  phases: phasesOf(v.connection),
  targetKwp: sizing.kwp,
  backupKw: hasBattery(v.systemType) ? Number(v.backupKw.replace(",", ".")) : undefined,
  backupNominalKwh: sizing.batteryNominalKwh,
});

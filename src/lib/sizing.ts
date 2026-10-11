/** Híbrido y aislado llevan baterías. */
export const hasBattery = (t: SystemType) => t !== "ongrid";

export type SystemType = "ongrid" | "hybrid" | "offgrid";

/** Rendimiento global del sistema (pérdidas de cableado, temperatura, suciedad…). Mismo valor que usaba el simulador. */
export const PERFORMANCE_RATIO = 0.8;
/** Relación potencia DC de paneles / potencia AC del inversor: objetivo y límites aceptables. */
export const DC_AC = { target: 1.2, min: 1.0, max: 1.4 };
/** Profundidad de descarga utilizable de la batería (litio). */
export const BATTERY_DOD = 0.8;
export const DAYS_PER_MONTH = 30;

export type SizingInput = {
  monthlyKwh: number; // consumo mensual a tomar como base
  coveragePct: number; // % del consumo que se quiere cubrir con solar (1-100)
  peakSunHours: number; // horas sol pico (kWh/m²/día)
  systemType: SystemType;
  tariff: number | null; // $/kWh, para ahorro
  backupLoadKw?: number; // híbrido: carga a respaldar · aislado: carga máxima simultánea
  autonomyHours?: number; // híbrido: horas de autonomía
};

export type Sizing = {
  monthlySolarKwh: number; // generación mensual objetivo
  kwp: number; // potencia pico necesaria
  inverterKw: { min: number; target: number; max: number }; // potencia AC aceptable para ese campo FV
  batteryKwh: number; // energía útil a almacenar (0 si on-grid)
  batteryNominalKwh: number; // capacidad nominal necesaria (considerando profundidad de descarga)
  monthlySavings: number | null;
};

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export function size(i: SizingInput): Sizing {
  const monthlySolarKwh = (i.monthlyKwh * i.coveragePct) / 100;
  const kwp = monthlySolarKwh / (DAYS_PER_MONTH * i.peakSunHours * PERFORMANCE_RATIO);
  // Híbrido: carga a respaldar × horas. Aislado: la energía que se consume durante las horas de autonomía (consumo diario × horas / 24).
  const batteryKwh =
    i.systemType === "hybrid" ? (i.backupLoadKw ?? 0) * (i.autonomyHours ?? 0)
    : i.systemType === "offgrid" ? (monthlySolarKwh / DAYS_PER_MONTH) * ((i.autonomyHours ?? 0) / 24)
    : 0;
  return {
    monthlySolarKwh: round(monthlySolarKwh, 1),
    kwp: round(kwp),
    inverterKw: { min: round(kwp / DC_AC.max), target: round(kwp / DC_AC.target), max: round(kwp / DC_AC.min) },
    batteryKwh: round(batteryKwh),
    batteryNominalKwh: round(batteryKwh / BATTERY_DOD),
    monthlySavings: i.tariff ? Math.round(monthlySolarKwh * i.tariff) : null,
  };
}

/** Consumo mensual base a partir del historial: promedio de los meses disponibles (o el del periodo). */
export function baseMonthlyKwh(current: number | null, history: { kwh: number }[]): number | null {
  const vals = history.map((h) => h.kwh).filter((v) => v > 0);
  if (vals.length >= 3) return round(vals.reduce((a, b) => a + b, 0) / vals.length, 1);
  return current && current > 0 ? current : vals.length ? vals[0] : null;
}

/** Retorno simple de la inversión, en años. */
export function paybackYears(total: number, monthlySavings: number | null): number | null {
  return monthlySavings && monthlySavings > 0 ? round(total / (monthlySavings * 12), 1) : null;
}

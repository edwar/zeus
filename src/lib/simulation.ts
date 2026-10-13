import { z } from "zod";
import { PUBLIC_SOURCES } from "@/lib/crm";
import { sizingOf, validate, type ReviewValues } from "@/lib/wizard";

/**
 * Cálculo guardado del simulador: lo que la persona configuró (cifras de su recibo ya confirmadas, el kit elegido y la
 * financiación simulada) para retomarlo con un enlace o recibirlo por correo. No guarda identidad: solo si ella deja su
 * correo (con autorización) se crea además un contacto en el seguimiento.
 */
export const SIMULATION_TTL_DAYS = 60;
export const simulationExpiry = (now = new Date()) => new Date(now.getTime() + SIMULATION_TTL_DAYS * 86_400_000);

const s = (max: number) => z.string().max(max);
const id = z.string().min(1).max(60);

/** Las cifras de la revisión. Todo texto corto y de lista cerrada donde se puede: nada de contenido libre. */
const values = z
  .object({
    operator: s(80), department: s(80), municipality: s(80),
    lat: s(12), lon: s(12), sunAnnual: s(6), sunMin: s(6),
    estrato: z.enum(["", "1", "2", "3", "4", "5", "6"]),
    connection: z.enum(["", "single_phase", "two_phase", "three_phase"]),
    monthlyKwh: s(12), tariff: s(12), coveragePct: s(6), peakSunHours: s(6),
    systemType: z.enum(["ongrid", "hybrid", "offgrid"]),
    backupKw: s(8), autonomyHours: s(8),
  })
  .strict()
  .refine((v) => Object.keys(validate(v as ReviewValues)).length === 0, { message: "invalid_values" })
  // Solo una ubicación aproximada (≈1 km), igual que en la solicitud de cotización.
  .transform((v) => ({ ...v, lat: roundCoord(v.lat), lon: roundCoord(v.lon) }));

function roundCoord(c: string): string {
  const n = Number(c);
  return c.trim() === "" || !Number.isFinite(n) ? "" : String(Math.round(n * 100) / 100);
}

const kit = z
  .object({
    tier: z.enum(["economic", "balanced", "premium", "custom"]),
    custom: z
      .object({
        panelId: id.optional(), panelQty: z.number().int().min(1).max(2000).optional(), inverterId: id.optional(), batteryId: id.optional(), structureId: id.optional(),
        extras: z.record(s(40), id).refine((r) => Object.keys(r).length <= 20).optional(),
      })
      .strict(),
    // Cantidades editadas a mano: la clave describe el producto y lo que lo originó (ver KitBuilder).
    qtyEdits: z.record(s(160), z.number().int().min(1).max(2000)).refine((r) => Object.keys(r).length <= 40),
    skipped: z.record(s(40), z.boolean()).refine((r) => Object.keys(r).length <= 20),
  })
  .strict();

const fin = z
  .object({ on: z.boolean(), downPct: z.number().int().min(0).max(90), termMonths: z.number().int().min(6).max(120), rate: s(8).nullable(), entity: s(80).nullable() })
  .strict();

export const simulationState = z.object({ values, kit, fin }).strict();
export type SimulationState = z.infer<typeof simulationState>;

export const createSimulationBody = z.object({
  lang: z.enum(["es", "en"]).default("es"),
  // Por dónde llegó (?src=…): solo estadística, de una lista fija.
  source: z.enum(PUBLIC_SOURCES).default("simulator"),
  state: simulationState,
  total: z.number().min(0).max(1e10),
  paybackYears: z.number().min(0).max(100).nullable(),
  // Si dejan su correo: autorización explícita para guardarlo, enviarles el cálculo y que un asesor los contacte.
  contact: z.object({ email: z.email().max(160), consent: z.literal(true) }).optional(),
});
export type CreateSimulation = z.infer<typeof createSimulationBody>;

/** Resumen para el correo y la nota del contacto. Potencia y ahorro se recalculan aquí con las cifras; el total lo informa el cliente. */
export type SimulationSummary = { kwp: number; monthlyKwh: number; monthlySavings: number | null; total: number; paybackYears: number | null };
export function summaryOf(state: SimulationState, total: number, paybackYears: number | null): SimulationSummary | null {
  const sz = sizingOf(state.values as ReviewValues);
  if (!sz) return null;
  return { kwp: sz.kwp, monthlyKwh: Math.round(sz.monthlySolarKwh), monthlySavings: sz.monthlySavings, total: Math.round(total), paybackYears };
}

/** Texto de la nota que queda en el contacto cuando alguien guarda su cálculo y deja su correo. */
export function leadNote(sum: SimulationSummary): string {
  const m = (n: number) => `$ ${Math.round(n).toLocaleString("es-CO")}`;
  return `Guardó su cálculo: sistema de ${sum.kwp} kWp, generación estimada ${sum.monthlyKwh} kWh/mes${sum.monthlySavings != null ? `, ahorro estimado ${m(sum.monthlySavings)}/mes` : ""}, kit por ${m(sum.total)}${sum.paybackYears != null ? `, recuperación en ${sum.paybackYears} años` : ""}.`;
}

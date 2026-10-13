import { z } from "zod";
import { E164 } from "@/lib/phone";
import { PUBLIC_SOURCES } from "@/lib/crm";

const text = (max: number) => z.string().trim().max(max);

/** Cifras de la factura ya confirmadas por el usuario. Sin campos de identidad (nombre, dirección, cuenta). */
export const quoteBillSchema = z.object({
  monthlyKwh: z.number().min(1).max(200_000),
  tariff: z.number().min(0).max(1e7).nullable(),
  currency: z.string().length(3).nullable(),
  operator: text(80).nullable(),
  municipality: text(80).nullable(),
  department: text(80).nullable(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lon: z.number().min(-180).max(180).nullable().optional(),
  estrato: z.number().int().min(1).max(6).nullable(),
  connection: z.enum(["single_phase", "two_phase", "three_phase"]).nullable(),
  coveragePct: z.number().min(1).max(100),
  peakSunHours: z.number().min(1).max(9),
  backupKw: z.number().min(0).max(100).optional(),
  autonomyHours: z.number().min(0).max(48).optional(),
});

export const quoteSizingSchema = z.object({
  kwp: z.number().min(0).max(1000),
  monthlySolarKwh: z.number().min(0).max(1e6),
  monthlySavings: z.number().min(0).nullable(),
  batteryNominalKwh: z.number().min(0).max(1000),
});

export const createQuoteSchema = z.object({
  contact: z.object({
    name: text(120).min(2),
    email: z.email().max(160),
    phone: z.string().trim().regex(E164),
    city: text(80).nullable().optional(),
  }),
  // Solo importa si hay equipo en su zona: zeus = que Zeus asigne uno; own = trae su propio instalador
  installerChoice: z.enum(["zeus", "own"]).optional(),
  // Simulación de financiación pedida por el cliente (el servidor recalcula la cuota; esto solo trae los parámetros)
  financing: z
    .object({ downPct: z.number().int().min(0).max(90), termMonths: z.number().int().min(6).max(120), rateEA: z.number().min(0).max(100), entity: text(80).nullable().optional() })
    .optional(),
  // Idioma de la página desde la que se pidió: los correos al cliente salen en él
  lang: z.enum(["es", "en"]).default("es"),
  // Por dónde llegó al simulador (?src=…). Solo estadística: el visitante no puede inventar orígenes fuera de la lista.
  source: z.enum(PUBLIC_SOURCES).default("simulator"),
  consent: z.literal(true), // autorización para tratar los datos de contacto (Ley 1581 de 2012)
  systemType: z.enum(["ongrid", "hybrid", "offgrid"]),
  bill: quoteBillSchema,
  sizing: quoteSizingSchema,
  items: z.array(z.object({ productId: z.string().min(1).max(40), qty: z.number().int().min(1).max(2000) })).min(1).max(30),
});

export type CreateQuote = z.infer<typeof createQuoteSchema>;

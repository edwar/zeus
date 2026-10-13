import { z } from "zod";
import { E164 } from "@/lib/phone";

/**
 * Seguimiento de contactos (CRM ligero). Sin base de datos: aquí van las reglas que se prueban aparte.
 * - Una solicitud del simulador ya es un lead; un `Lead` es alguien que aún no pidió cotización.
 * - Origen = de dónde llegó la persona; con él se mide qué canal convierte.
 */
export const SOURCES = ["simulator", "catalog", "referral", "social", "event", "phone", "other"] as const;
export type Source = (typeof SOURCES)[number];

/** Orígenes que puede traer un visitante en el enlace (`?src=`): no se pueden verificar, así que solo sirven para estadística. */
export const PUBLIC_SOURCES = ["simulator", "catalog", "referral", "social"] as const;
export const isPublicSource = (s: unknown): s is (typeof PUBLIC_SOURCES)[number] => (PUBLIC_SOURCES as readonly string[]).includes(s as string);
/** Orígenes que elige el equipo al registrar un contacto a mano (el simulador y el catálogo se detectan solos). */
export const MANUAL_SOURCES = ["referral", "social", "event", "phone", "other"] as const;

export const LEAD_STATUSES = ["open", "converted", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

const text = (max: number) => z.string().trim().max(max);

export const leadBody = z.object({
  name: text(120).min(2),
  phone: z.string().trim().regex(E164),
  email: z.union([z.email().max(160), z.literal(""), z.null()]).optional().transform((v) => v || null),
  city: text(80).nullable().optional().transform((v) => v || null),
  source: z.enum(MANUAL_SOURCES),
  note: text(1000).optional(),
  // Fecha del primer recordatorio (opcional)
  followUpOn: z.iso.date().optional(),
  consent: z.literal(true), // la persona autorizó que se guarden sus datos
});

export const leadPatch = z.object({
  name: text(120).min(2).optional(),
  phone: z.string().trim().regex(E164).optional(),
  email: z.union([z.email().max(160), z.literal(""), z.null()]).optional().transform((v) => (v === undefined ? undefined : v || null)),
  city: text(80).nullable().optional().transform((v) => (v === undefined ? undefined : v || null)),
  source: z.enum(MANUAL_SOURCES).optional(),
  status: z.enum(["open", "lost"]).optional(),
  lostReason: text(300).optional(),
});

export const noteBody = z.object({ body: text(1000).min(1) });
export const followUpBody = z.object({ dueOn: z.iso.date(), note: text(300).min(2), assigneeId: z.string().max(60).nullable().optional() });
export const followUpPatch = z.object({ dueOn: z.iso.date().optional(), note: text(300).min(2).optional(), done: z.boolean().optional() });

/** Zona horaria del negocio: «hoy» y «vencido» se miden en hora de Colombia, no en la del servidor. */
export const TZ = "America/Bogota";
export const todayBogota = (now = new Date()) => now.toLocaleDateString("sv-SE", { timeZone: TZ });

export type Bucket = "overdue" | "today" | "upcoming";
/** `dueOn` y `today` son YYYY-MM-DD, así que comparar como texto es comparar fechas. */
export const bucketOf = (dueOn: string, today: string): Bucket => (dueOn < today ? "overdue" : dueOn === today ? "today" : "upcoming");

/** Mismo contacto = mismo teléfono (ya normalizado E.164) o mismo correo sin importar mayúsculas. */
export const normEmail = (e: string | null | undefined) => (e ? e.trim().toLowerCase() : null);

export type SourceRow = {
  source: string;
  /** Solicitudes (cotizaciones pedidas) que llegaron por este origen en el periodo. */
  requests: number;
  /** Ya hubo contacto con el cliente (contactada, cálculo confirmado o aprobada). */
  attended: number;
  confirmed: number;
  approved: number;
  discarded: number;
  /** Contactos manuales que aún no piden cotización. */
  openLeads: number;
  /** Aprobadas / solicitudes (null si aún no hay solicitudes). */
  rate: number | null;
};

const QUOTE_ATTENDED = ["contacted", "confirmed", "approved"];

/** Une los conteos por estado de las solicitudes y de los contactos en una fila por origen (todos los orígenes aparecen, aunque estén en 0). */
export function summarizeBySource(quotes: { source: string; status: string; n: number }[], leads: { source: string; n: number }[]): SourceRow[] {
  const known = new Set<string>(SOURCES);
  const keys = [...SOURCES, ...[...quotes, ...leads].map((r) => r.source).filter((s) => !known.has(s))];
  return [...new Set(keys)].map((source) => {
    const q = quotes.filter((r) => r.source === source);
    const sum = (pred: (st: string) => boolean) => q.filter((r) => pred(r.status)).reduce((n, r) => n + r.n, 0);
    const requests = sum(() => true);
    const approved = sum((st) => st === "approved");
    return {
      source,
      requests,
      attended: sum((st) => QUOTE_ATTENDED.includes(st)),
      confirmed: sum((st) => st === "confirmed" || st === "approved"),
      approved,
      discarded: sum((st) => st === "discarded"),
      openLeads: leads.filter((l) => l.source === source).reduce((n, l) => n + l.n, 0),
      rate: requests > 0 ? approved / requests : null,
    };
  });
}

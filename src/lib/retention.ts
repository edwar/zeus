import { prisma } from "@/lib/prisma";
import { anonymizeQuotes, ERASED_EMAIL } from "@/lib/erasure";
import { LEGAL } from "@/lib/legal/config";

/**
 * Limpieza automática: aplica los plazos que promete la política de privacidad (sección 9) y borra lo que ya no sirve.
 * Cada categoría se procesa en lotes y es idempotente: si una corrida se corta, la siguiente continúa donde quedó.
 *
 * Lo que NO se toca solo: los proyectos (fotos, documentos, acta: garantía), las solicitudes ya aprobadas (son una venta,
 * pueden tener obligaciones contables) y los casos publicados (los retira el cliente). Esas decisiones son de una persona.
 */
const DAY = 86_400_000;

/** Resta meses de calendario (UTC), no «30 días»: 24 meses atrás es la misma fecha dos años antes. */
export function monthsAgo(now: Date, months: number): Date {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

export function retentionCutoffs(now = new Date()) {
  const p = LEGAL.retentionPolicy;
  return {
    /** Solicitudes y contactos sin ninguna actividad desde esta fecha. */
    quotes: monthsAgo(now, p.quotesMonths),
    /** Cuentas del equipo desactivadas desde esta fecha o antes. */
    accounts: monthsAgo(now, p.accountsMonths),
    /** Los cálculos del simulador llevan su propio vencimiento (`expiresAt`, a los 60 días): se borran al vencer. */
    simulations: now,
    /** Sesiones vencidas hace más de 30 días (guardan IP y navegador). */
    sessions: new Date(now.getTime() - 30 * DAY),
    /** Registros técnicos de límites de uso y de lecturas de facturas (solo huellas de conexión). */
    technical: new Date(now.getTime() - 30 * DAY),
  };
}

export type RetentionResult = { quotes: number; leads: number; simulations: number; accounts: number; sessions: number; technical: number };

/** Actividad reciente = algún evento, nota o recordatorio (pendiente o movido) desde `since`. */
const quiet = (since: Date) => ({
  followUps: { none: { OR: [{ doneAt: null }, { createdAt: { gte: since } }, { doneAt: { gte: since } }] } },
});

export async function runRetention(opts: { now?: Date; batch?: number } = {}): Promise<RetentionResult> {
  const now = opts.now ?? new Date();
  const take = opts.batch ?? 500;
  const cut = retentionCutoffs(now);

  // Solicitudes sin proyecto, sin venta aprobada y sin actividad: se anonimizan (el cálculo queda para las estadísticas).
  const quotes = await prisma.quoteRequest.findMany({
    where: {
      status: { not: "approved" },
      project: { is: null },
      contactEmail: { not: ERASED_EMAIL },
      updatedAt: { lt: cut.quotes },
      events: { none: { createdAt: { gte: cut.quotes } } },
      ...quiet(cut.quotes),
    },
    select: { id: true },
    take,
  });
  await prisma.$transaction((tx) => anonymizeQuotes(tx, quotes.map((q) => q.id)));

  // Contactos en seguimiento sin actividad y sin una solicitud que haya que conservar.
  const leads = await prisma.lead.findMany({
    where: {
      updatedAt: { lt: cut.quotes },
      notes: { none: { createdAt: { gte: cut.quotes } } },
      OR: [{ quoteId: null }, { quote: { is: { project: { is: null }, status: { not: "approved" } } } }],
      ...quiet(cut.quotes),
    },
    select: { id: true },
    take,
  });
  const leadsGone = await prisma.lead.deleteMany({ where: { id: { in: leads.map((l) => l.id) } } });

  const simulations = await prisma.simulation.deleteMany({ where: { expiresAt: { lt: cut.simulations } } });

  // Cuentas del equipo dadas de baja (desactivadas) hace más de 12 meses. `updatedAt` es la última vez que se tocó la cuenta.
  const accountIds = await prisma.user.findMany({ where: { banned: true, updatedAt: { lt: cut.accounts } }, select: { id: true }, take });
  const accounts = await prisma.user.deleteMany({ where: { id: { in: accountIds.map((u) => u.id) } } });

  const sessions = await prisma.session.deleteMany({ where: { expiresAt: { lt: cut.sessions } } });
  await prisma.verification.deleteMany({ where: { expiresAt: { lt: now } } });
  const limits = await prisma.rateLimit.deleteMany({ where: { lastRequest: { lt: BigInt(now.getTime() - 2 * DAY) } } });
  const extractions = await prisma.extractionLog.deleteMany({ where: { createdAt: { lt: cut.technical } } });

  const result: RetentionResult = { quotes: quotes.length, leads: leadsGone.count, simulations: simulations.count, accounts: accounts.count, sessions: sessions.count, technical: limits.count + extractions.count };
  // Constancia sin datos personales, solo si hubo algo que limpiar (así el historial no se llena de corridas vacías).
  if (result.quotes + result.leads + result.simulations + result.accounts > 0) {
    await prisma.erasureLog.create({ data: { by: "retención automática", quotes: result.quotes, leads: result.leads, simulations: result.simulations, projectsKept: 0, emailsBlocked: 0 } });
  }
  return result;
}

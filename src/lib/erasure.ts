import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { emailHash, normalizeEmail } from "@/lib/unsubscribe";

/**
 * Eliminar los datos de una persona (derecho de supresión, Ley 1581 de 2012). Se parte de una solicitud o de un contacto
 * y se alcanza todo lo que tenga el mismo correo o teléfono: solicitudes, contactos, cálculos del simulador y recordatorios.
 *
 * Lo que NO se borra, y por qué: el proyecto, sus fotos, documentos y el acta firmada se conservan porque hay una garantía
 * y una obligación contractual de por medio; solo se anonimiza el nombre del cliente y se invalida su enlace del portal.
 * Los casos publicados se retiran desde «Casos» (los autorizó el cliente aparte).
 */
export const ERASED_NAME = "Datos eliminados";
export const ERASED_EMAIL = "eliminado@invalid.invalid";

export type ErasureResult = { quotes: number; leads: number; simulations: number; projectsKept: number; emailsBlocked: number };

type Who = { quoteId: string; leadId?: undefined } | { leadId: string; quoteId?: undefined };

/** Correos y teléfonos con los que se reconoce a la persona; null si el registro no existe. */
async function identityOf(who: Who): Promise<{ emails: string[]; phones: string[] } | null> {
  if (who.quoteId) {
    const q = await prisma.quoteRequest.findUnique({ where: { id: who.quoteId }, select: { contactEmail: true, contactPhone: true, lead: { select: { email: true, phone: true } } } });
    if (!q) return null;
    return pack([q.contactEmail, q.lead?.email], [q.contactPhone, q.lead?.phone]);
  }
  const l = await prisma.lead.findUnique({ where: { id: who.leadId }, select: { email: true, phone: true, quote: { select: { contactEmail: true, contactPhone: true } } } });
  if (!l) return null;
  return pack([l.email, l.quote?.contactEmail], [l.phone, l.quote?.contactPhone]);
}

const pack = (emails: (string | null | undefined)[], phones: (string | null | undefined)[]) => ({
  emails: [...new Set(emails.filter((e): e is string => Boolean(e)).map(normalizeEmail))],
  phones: [...new Set(phones.filter((p): p is string => Boolean(p)))],
});

/** Devuelve null si el registro no existe (nada que eliminar). Todo ocurre en una sola transacción: o se elimina todo o nada. */
export async function eraseSubject(who: Who, by: string): Promise<ErasureResult | null> {
  const id = await identityOf(who);
  if (!id) return null;
  const emailMatch = id.emails.map((e) => ({ equals: e, mode: "insensitive" as const }));

  return prisma.$transaction(async (tx) => {
    const quoteWhere: Prisma.QuoteRequestWhereInput = { OR: [...emailMatch.map((contactEmail) => ({ contactEmail })), ...(id.phones.length ? [{ contactPhone: { in: id.phones } }] : [])] };
    const leadWhere: Prisma.LeadWhereInput = {
      OR: [...emailMatch.map((email) => ({ email })), ...(id.phones.length ? [{ phone: { in: id.phones } }] : []), ...(who.leadId ? [{ id: who.leadId }] : [])],
    };
    const quotes = await tx.quoteRequest.findMany({ where: quoteWhere, select: { id: true, project: { select: { id: true } } } });
    const quoteIds = quotes.map((q) => q.id);
    const projectIds = quotes.flatMap((q) => (q.project ? [q.project.id] : []));

    // Contactos: se borran enteros (con sus notas y recordatorios, que caen en cascada).
    const leads = await tx.lead.deleteMany({ where: leadWhere });
    // Cálculos guardados del simulador con ese correo.
    const simulations = id.emails.length ? await tx.simulation.deleteMany({ where: { OR: emailMatch.map((email) => ({ email })) } }) : { count: 0 };

    if (quoteIds.length) {
      await tx.followUp.deleteMany({ where: { quoteId: { in: quoteIds } } });
      // Las notas libres del historial pueden nombrar a la persona; los cambios de estado y los avisos enviados se conservan.
      await tx.quoteEvent.updateMany({ where: { quoteId: { in: quoteIds }, OR: [{ subject: null }, { subject: { not: "notice" } }] }, data: { note: null } });
      // `bill`, `sizing`, `items` y el total son del cálculo, no de la persona: se conservan para las estadísticas.
      await tx.quoteRequest.updateMany({
        where: { id: { in: quoteIds } },
        data: { contactName: ERASED_NAME, contactEmail: ERASED_EMAIL, contactPhone: "eliminado", city: null, ipHash: "eliminado", shareTokenHash: null, shareExpiresAt: null, clientDecisionNote: null, discardReason: null },
      });
    }
    if (projectIds.length) {
      // Invalidar el enlace del portal (subir la versión) y no volver a avisarle por correo.
      await tx.project.updateMany({ where: { id: { in: projectIds } }, data: { client: ERASED_NAME, notifyClient: false, portalVersion: { increment: 1 } } });
    }

    // El correo de relleno también queda en la lista: un aviso a una solicitud ya eliminada no debe salir a ninguna parte.
    for (const email of [...id.emails, ERASED_EMAIL]) {
      await tx.suppression.upsert({ where: { emailHash: emailHash(email) }, create: { emailHash: emailHash(email), reason: "erased", createdBy: by }, update: { reason: "erased" } });
    }
    const result: ErasureResult = { quotes: quoteIds.length, leads: leads.count, simulations: simulations.count, projectsKept: projectIds.length, emailsBlocked: id.emails.length };
    await tx.erasureLog.create({ data: { by, ...result } });
    return result;
  });
}

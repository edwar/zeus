import { prisma } from "@/lib/prisma";
import { tooLarge } from "@/lib/http";
import { hitLimit, ipHashOf } from "@/lib/ratelimit";
import { createHash } from "node:crypto";
import { hashShareToken, newShareToken } from "@/lib/quote-share";
import { createSimulationBody, leadNote, simulationExpiry, summaryOf } from "@/lib/simulation";
import { normEmail, todayBogota } from "@/lib/crm";
import { simulationEmail } from "@/lib/mail";
import { deliverToClient } from "@/lib/client-mail";
import type { NoticeOutcome } from "@/lib/notice-core";
import { absoluteUrl } from "@/lib/site";
import { toDate } from "@/lib/crm-server";

/**
 * Público: guarda el cálculo del simulador y devuelve un enlace para retomarlo. Sin correo es anónimo. Con correo
 * (y la autorización de la persona) además se le envía el enlace y se crea un contacto para que un asesor la ayude.
 */
export async function POST(req: Request) {
  const big = tooLarge(req, 20_000);
  if (big) return big;
  const ipHash = ipHashOf(req);
  const limit = await hitLimit("simulation-save", ipHash, 20, 3_600_000);
  if (!limit.ok) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  const parsed = createSimulationBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const b = parsed.data;
  const summary = summaryOf(b.state, b.total, b.paybackYears);
  if (!summary) return Response.json({ error: "invalid_body" }, { status: 400 });

  const email = b.contact ? normEmail(b.contact.email) : null;
  if (email) {
    // Escribir a una dirección ajena es el abuso posible de esta función: tope por conexión y por destinatario.
    const mailIp = await hitLimit("simulation-mail-ip", ipHash, 5, 3_600_000);
    const mailTo = await hitLimit("simulation-mail-to", createHash("sha256").update(email).digest("hex").slice(0, 32), 3, 86_400_000);
    if (!mailIp.ok || !mailTo.ok) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(Math.max(mailIp.ok ? 0 : mailIp.retryAfterSec, mailTo.ok ? 0 : mailTo.retryAfterSec)) } });
  }

  const token = newShareToken();
  const expiresAt = simulationExpiry();
  const now = new Date();
  const sim = await prisma.simulation.create({
    data: { tokenHash: hashShareToken(token), lang: b.lang, source: b.source, state: b.state, summary, email, emailConsentAt: email ? now : null, expiresAt },
    select: { id: true },
  });
  // Limpieza de calculos vencidos hace tiempo (de vez en cuando, sin depender de una tarea programada).
  if (Math.random() < 0.05) await prisma.simulation.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 7 * 86_400_000) } } }).catch(() => {});

  const url = absoluteUrl(`/${b.lang}/simulator?s=${token}`);
  let emailed: NoticeOutcome | null = null;
  if (email) {
    emailed = await deliverToClient(email, b.lang, simulationEmail({ lang: b.lang, url, validUntil: expiresAt, kwp: summary.kwp, monthlySavings: summary.monthlySavings, total: summary.total }));
    // Quien se dio de baja no vuelve a la lista de seguimiento por guardar otro cálculo.
    if (emailed !== "suppressed") await captureLead({ email, source: b.source, note: leadNote(summary), simulationId: sim.id }).catch((e) => console.error("simulation lead", e));
  }
  return Response.json({ url, expiresAt: expiresAt.toISOString(), emailed }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

/**
 * El correo es un contacto: si ya existe (como contacto o como solicitud) se deja una nota; si no, se crea uno nuevo con
 * un recordatorio para escribirle mañana. Nunca duplica.
 */
async function captureLead(o: { email: string; source: string; note: string; simulationId: string }) {
  const sameEmail = { equals: o.email, mode: "insensitive" as const };
  const [lead, quote] = await Promise.all([
    prisma.lead.findFirst({ where: { email: sameEmail, status: { not: "lost" } }, select: { id: true } }),
    prisma.quoteRequest.findFirst({ where: { contactEmail: sameEmail }, orderBy: { createdAt: "desc" }, select: { id: true, status: true } }),
  ]);
  if (lead) return void (await prisma.leadNote.create({ data: { leadId: lead.id, userName: "Simulador", body: `Volvió a guardar un cálculo. ${o.note}` } }));
  if (quote) return void (await prisma.quoteEvent.create({ data: { quoteId: quote.id, toStatus: quote.status, subject: "note", userName: "Simulador", note: `Guardó un nuevo cálculo en el simulador. ${o.note}` } }));
  const tomorrow = new Date(Date.parse(`${todayBogota()}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  await prisma.lead.create({
    data: {
      name: o.email, email: o.email, source: o.source, consentAt: new Date(), createdBy: "Simulador",
      notes: { create: { body: o.note, userName: "Simulador" } },
      // Sin responsable: aparece en «Todos» para que quien atienda lo tome mientras el interés está fresco.
      followUps: { create: { dueOn: toDate(tomorrow), note: "Escribirle: guardó su cálculo en el simulador", createdBy: "Simulador" } },
    },
  });
}

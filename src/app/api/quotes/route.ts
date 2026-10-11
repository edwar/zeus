import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/session";
import { ipHashOf } from "@/lib/ratelimit";
import { createQuoteSchema } from "@/lib/quotes";
import { tooLarge } from "@/lib/http";
import { findCoverage } from "@/lib/teams";
import { currentUsury } from "@/lib/finance/rates";
import { simulateLoan } from "@/lib/finance/loan";
import { KIT_KINDS } from "@/lib/quote-flow";

const MAX_PER_HOUR = 5;

/** Público: crea la solicitud. Los precios SIEMPRE se toman de la base; lo que mande el cliente se ignora. */
export async function POST(req: Request) {
  const big = tooLarge(req, 50_000);
  if (big) return big;
  const parsed = createQuoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const q = parsed.data;

  const ipHash = ipHashOf(req);
  const recent = await prisma.quoteRequest.count({ where: { ipHash, createdAt: { gt: new Date(Date.now() - 3_600_000) } } });
  if (recent >= MAX_PER_HOUR) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "3600" } });

  // Unifica líneas repetidas del mismo producto y valida contra el catálogo vigente.
  const qty = new Map<string, number>();
  for (const i of q.items) qty.set(i.productId, (qty.get(i.productId) ?? 0) + i.qty);
  const products = await prisma.product.findMany({
    where: { id: { in: [...qty.keys()] }, active: true, price: { gt: 0 }, kind: { in: [...KIT_KINDS] } },
  });
  if (products.length !== qty.size) return Response.json({ error: "unknown_product" }, { status: 400 });

  const items = products.map((p) => ({
    productId: p.id,
    kind: p.kind,
    nameSnapshot: p.name,
    unitPrice: p.price,
    qty: qty.get(p.id)!,
  }));
  const total = items.reduce((n, i) => n + Number(i.unitPrice) * i.qty, 0);

  // La modalidad se decide en el servidor con la ubicación y los equipos que cubren la zona. El cliente solo expresa
  // si prefiere traer a su propio instalador; nunca fuerza la instalación de Zeus donde no hay equipo.
  const cov = await findCoverage(q.bill.lat, q.bill.lon);
  const own = cov.status === "install" && q.installerChoice === "own";
  const fulfillment = cov.status === "install" ? (own ? "kit_only" : "install") : cov.status;
  // Financiación: la cuota se recalcula aquí con el total real del kit; la tasa no puede pasar del tope de usura vigente.
  let financing: object | undefined;
  if (q.financing) {
    const usury = await currentUsury().catch(() => null);
    const cap = usury?.usuryEA ?? 40; // sin dato público, un tope prudente
    const rateEA = Math.min(q.financing.rateEA, cap);
    const loan = simulateLoan({ price: total, downPct: q.financing.downPct, termMonths: q.financing.termMonths, rateEA });
    financing = { ...q.financing, rateEA, entity: q.financing.entity ?? null, usuryEA: usury?.usuryEA ?? null, ...loan };
  }
  const created = await prisma.quoteRequest.create({
    data: {
      fulfillment,
      distanceKm: cov.distanceKm,
      installerChoice: cov.status === "install" ? (q.installerChoice ?? "zeus") : null,
      teamId: fulfillment === "install" ? cov.teamId : null,
      ...(financing && { financing }),
      contactName: q.contact.name,
      contactEmail: q.contact.email,
      contactPhone: q.contact.phone,
      city: q.contact.city || null,
      systemType: q.systemType,
      bill: q.bill,
      sizing: q.sizing,
      total,
      consentAt: new Date(),
      ipHash,
      items: { create: items },
    },
    select: { id: true, total: true },
  });
  return Response.json({ id: created.id, total: Number(created.total), fulfillment, covered: cov.status === "install" }, { status: 201 });
}

/** Equipo: lista de solicitudes, las más recientes primero. */
export async function GET(req: Request) {
  const denied = await guardApi(req, { perm: "quotes" });
  if (denied) return denied;
  const rows = await prisma.quoteRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { items: true } } },
  });
  return Response.json(
    rows.map((r) => ({
      id: r.id,
      status: r.status,
      contactName: r.contactName,
      city: r.city,
      systemType: r.systemType,
      total: Number(r.total),
      currency: r.currency,
      itemCount: r._count.items,
      fulfillment: r.fulfillment,
      createdAt: r.createdAt.toISOString(),
    })),
  );
}

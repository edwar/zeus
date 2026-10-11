import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/session";
import { KIT_KINDS } from "@/lib/quote-flow";
import type { Prisma } from "@/generated/prisma/client";

const query = z.object({ q: z.string().trim().max(100).optional(), kind: z.enum(KIT_KINDS).optional() });

/** Equipo: busca productos vendibles para cambiar o agregar líneas en el kit de una solicitud. */
export async function GET(req: Request) {
  const denied = await guardApi(req, { perm: "quotes" });
  if (denied) return denied;
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return Response.json({ error: "invalid_query" }, { status: 400 });
  const { q, kind } = parsed.data;
  const where: Prisma.ProductWhereInput = {
    active: true,
    price: { gt: 0 },
    kind: kind ? kind : { in: [...KIT_KINDS] },
    ...(q && { name: { contains: q, mode: "insensitive" } }),
  };
  const rows = await prisma.product.findMany({ where, orderBy: [{ price: "asc" }], take: 30, select: { id: true, name: true, kind: true, price: true } });
  return Response.json(rows.map((p) => ({ id: p.id, name: p.name, kind: p.kind, unitPrice: Number(p.price) })));
}

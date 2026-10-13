import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";

/** Productos que todavía no llevan inventario, para elegir cuál empezar a controlar (búsqueda por nombre, referencia o fabricante). */
export async function GET(req: NextRequest) {
  const a = await authorize(req, "stock");
  if (a.denied) return a.denied;
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  const rows = await prisma.product.findMany({
    where: {
      stock: { is: null },
      ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }, { manufacturer: { name: { contains: q, mode: "insensitive" } } }] }),
    },
    select: { id: true, name: true, sku: true, source: true, supplierPrice: true, manufacturer: { select: { name: true } } },
    orderBy: { name: "asc" },
    take: 15,
  });
  return Response.json(rows.map((r) => ({ id: r.id, name: r.name, sku: r.sku, source: r.source, manufacturer: r.manufacturer.name, supplierPrice: r.supplierPrice == null ? null : Number(r.supplierPrice) })));
}

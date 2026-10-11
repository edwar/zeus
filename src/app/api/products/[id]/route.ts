import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/session";
import { effectiveCommission, salePrice } from "@/lib/pricing";
import { getGlobalCommission } from "@/lib/settings";
import { toDetail, updateImportedSchema, updateManualSchema } from "@/lib/products";
import { invalidateCatalog } from "@/lib/catalog-cache";

const include = { manufacturer: { select: { id: true, name: true } } } as const;

export async function GET(req: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const denied = await guardApi(req, { perm: "catalog" });
  if (denied) return denied;
  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({ where: { id }, include });
  if (!product) return Response.json({ error: "Product not found" }, { status: 404 });
  return Response.json(toDetail(product));
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const denied = await guardApi(req, { perm: "catalog" });
  if (denied) return denied;
  const { id } = await ctx.params;
  const current = await prisma.product.findUnique({ where: { id } });
  if (!current) return Response.json({ error: "Product not found" }, { status: 404 });
  const body = await req.json().catch(() => null);

  if (current.source === "manual") {
    const parsed = updateManualSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
    if (parsed.data.manufacturerId && !(await prisma.manufacturer.findUnique({ where: { id: parsed.data.manufacturerId } }))) {
      return Response.json({ error: "Manufacturer not found" }, { status: 400 });
    }
    const updated = await prisma.product.update({ where: { id }, data: parsed.data, include });
    invalidateCatalog();
    return Response.json(toDetail(updated));
  }

  // Importado de Autosolar: el contenido lo repone cada sincronización; aquí solo comisión y visibilidad.
  const parsed = updateImportedSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  const data: Record<string, unknown> = { ...parsed.data };
  if ("commissionPct" in parsed.data && current.supplierPrice != null) {
    data.price = salePrice(Number(current.supplierPrice), effectiveCommission(parsed.data.commissionPct, await getGlobalCommission()));
  }
  const updated = await prisma.product.update({ where: { id }, data, include });
  invalidateCatalog();
  return Response.json(toDetail(updated));
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const denied = await guardApi(req, { perm: "catalog" });
  if (denied) return denied;
  const { id } = await ctx.params;
  try {
    await prisma.product.delete({ where: { id } });
    invalidateCatalog();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }
}

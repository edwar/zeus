import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { manufacturerSchema } from "@/lib/products";
import { invalidateCatalog } from "@/lib/catalog-cache";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/manufacturers/[id]">) {
  const denied = await guardApi(req, { perm: "catalog" });
  if (denied) return denied;
  const { id } = await ctx.params;
  const parsed = manufacturerSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  const slug = parsed.data.name ? slugify(parsed.data.name) : undefined;
  if (parsed.data.name && !slug) return Response.json({ error: "Invalid name" }, { status: 400 });
  try {
    const m = await prisma.manufacturer.update({ where: { id }, data: { ...parsed.data, ...(slug && { slug }) } });
    invalidateCatalog();
    return Response.json(m);
  } catch (e) {
    const code = (e as { code?: string }).code;
    return Response.json({ error: code === "P2002" ? "Manufacturer already exists" : "Manufacturer not found" }, { status: code === "P2002" ? 409 : 404 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/manufacturers/[id]">) {
  const denied = await guardApi(req, { perm: "catalog" });
  if (denied) return denied;
  const { id } = await ctx.params;
  if (await prisma.product.count({ where: { manufacturerId: id } })) {
    return Response.json({ error: "Manufacturer has products" }, { status: 409 });
  }
  try {
    await prisma.manufacturer.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Manufacturer not found" }, { status: 404 });
  }
}

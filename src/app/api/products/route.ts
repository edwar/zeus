import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { createProductSchema, toDetail, toListItem } from "@/lib/products";
import type { Prisma } from "@/generated/prisma/client";
import { invalidateCatalog } from "@/lib/catalog-cache";

const query = z.object({
  q: z.string().trim().max(100).optional(),
  manufacturerId: z.string().optional(),
  source: z.enum(["manual", "autosolar"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(req: Request) {
  const denied = await guardApi(req, { perm: "catalog" });
  if (denied) return denied;

  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return Response.json({ error: "Invalid query" }, { status: 400 });
  const { q, manufacturerId, source, page, pageSize } = parsed.data;

  const where: Prisma.ProductWhereInput = {
    ...(manufacturerId && { manufacturerId }),
    ...(source && { source }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { manufacturer: { select: { id: true, name: true } } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return Response.json({ items: items.map(toListItem), total, page, pageSize });
}

export async function POST(req: Request) {
  const denied = await guardApi(req, { perm: "catalog" });
  if (denied) return denied;

  const parsed = createProductSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  const { manufacturerId, specs, ...rest } = parsed.data;

  if (!(await prisma.manufacturer.findUnique({ where: { id: manufacturerId } }))) {
    return Response.json({ error: "Manufacturer not found" }, { status: 400 });
  }

  const base = slugify(rest.name) || "producto";
  let slug = base;
  for (let n = 2; await prisma.product.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;

  const product = await prisma.product.create({
    data: { ...rest, slug, specs, manufacturerId, source: "manual" },
    include: { manufacturer: { select: { id: true, name: true } } },
  });
  invalidateCatalog();
  return Response.json(toDetail(product), { status: 201 });
}

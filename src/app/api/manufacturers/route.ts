import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { manufacturerSchema, type ManufacturerDto } from "@/lib/products";
import { safeHttpUrl } from "@/lib/url";

export async function GET(req: Request) {
  const denied = await guardApi(req, { perm: "catalog" });
  if (denied) return denied;
  const rows = await prisma.manufacturer.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } });
  const dto: ManufacturerDto[] = rows.map((m) => ({
    id: m.id, name: m.name, slug: m.slug, website: safeHttpUrl(m.website), logoUrl: safeHttpUrl(m.logoUrl), productCount: m._count.products,
  }));
  return Response.json(dto);
}

export async function POST(req: Request) {
  const denied = await guardApi(req, { perm: "catalog" });
  if (denied) return denied;
  const parsed = manufacturerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  const slug = slugify(parsed.data.name);
  if (!slug) return Response.json({ error: "Invalid name" }, { status: 400 });
  try {
    const m = await prisma.manufacturer.create({ data: { ...parsed.data, slug } });
    return Response.json({ ...m, productCount: 0 }, { status: 201 });
  } catch {
    return Response.json({ error: "Manufacturer already exists" }, { status: 409 });
  }
}

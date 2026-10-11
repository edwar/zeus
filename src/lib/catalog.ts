import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import { cleanDescription } from "./text";
import { safeHttpUrl } from "./url";
import type { Spec } from "./scraper/autosolar";

export const CATALOG_TAG = "catalog";
export const PAGE_SIZE = 12;

export type CatalogItem = {
  slug: string;
  name: string;
  category: string | null;
  manufacturer: string;
  price: number;
  currency: string;
  inStock: boolean;
  image: string | null;
};

export type CatalogDetail = CatalogItem & {
  sku: string | null;
  description: string | null;
  specs: Spec[];
  datasheetUrl: string | null;
  images: string[];
};

export type Facets = { categories: { name: string; count: number }[]; manufacturers: { name: string; slug: string; count: number }[] };

type Row = Prisma.ProductGetPayload<{ include: { manufacturer: { select: { name: true } } } }>;

const imagesOf = (p: Row) => ((p.images as { url: string }[] | null) ?? []).map((i) => i.url).filter(Boolean);

const toItem = (p: Row): CatalogItem => ({
  slug: p.slug,
  name: p.name,
  category: p.category,
  manufacturer: p.manufacturer.name,
  price: Number(p.price),
  currency: p.currency,
  inStock: p.inStock,
  image: imagesOf(p)[0] ?? null,
});

/** Listado público: solo productos visibles. Los agotados van al final. */
export async function getCatalogPage(f: { q: string; category: string; manufacturer: string; page: number }) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const where: Prisma.ProductWhereInput = {
    active: true,
    ...(f.category && { category: f.category }),
    ...(f.manufacturer && { manufacturer: { slug: f.manufacturer } }),
    ...(f.q && {
      OR: [
        { name: { contains: f.q, mode: "insensitive" } },
        { category: { contains: f.q, mode: "insensitive" } },
        { manufacturer: { name: { contains: f.q, mode: "insensitive" } } },
      ],
    }),
  };
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { manufacturer: { select: { name: true } } },
      orderBy: [{ inStock: "desc" }, { name: "asc" }, { id: "asc" }],
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return { items: rows.map(toItem), total, page: f.page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getFacets(): Promise<Facets> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const [cats, makers] = await Promise.all([
    prisma.product.groupBy({ by: ["category"], where: { active: true, category: { not: null } }, _count: { _all: true }, orderBy: { category: "asc" } }),
    prisma.manufacturer.findMany({
      where: { products: { some: { active: true } } },
      select: { name: true, slug: true, _count: { select: { products: { where: { active: true } } } } },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    categories: cats.map((c) => ({ name: c.category as string, count: c._count._all })),
    manufacturers: makers.map((m) => ({ name: m.name, slug: m.slug, count: m._count.products })),
  };
}

export async function getCatalogProduct(slug: string): Promise<CatalogDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const p = await prisma.product.findFirst({ where: { slug, active: true }, include: { manufacturer: { select: { name: true } } } });
  if (!p) return null;
  return {
    ...toItem(p),
    sku: p.sku,
    description: p.source === "autosolar" ? cleanDescription(p.description) : p.description,
    specs: (p.specs as Spec[] | null) ?? [],
    datasheetUrl: safeHttpUrl(p.datasheetUrl),
    images: imagesOf(p),
  };
}

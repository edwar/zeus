import type { Manufacturer, Product } from "@/generated/prisma/client";
import { z } from "zod";
import { safeHttpUrl } from "./url";
import type { Spec } from "./scraper/autosolar";

export type ManufacturerDto = { id: string; name: string; slug: string; website: string | null; logoUrl: string | null; productCount: number };

export type ProductImage = { src: string; url: string };

export type ProductListItem = {
  id: string;
  source: "manual" | "autosolar";
  name: string;
  slug: string;
  category: string | null;
  manufacturer: { id: string; name: string };
  supplierPrice: number | null;
  commissionPct: number | null;
  price: number;
  currency: string;
  active: boolean;
  inStock: boolean;
  image: string | null;
};

export type ProductDetail = ProductListItem & {
  sourceUrl: string | null;
  sku: string | null;
  description: string | null;
  specs: Spec[];
  datasheetUrl: string | null;
  images: ProductImage[];
  lastSyncedAt: string | null;
};

type WithManufacturer = Product & { manufacturer: Pick<Manufacturer, "id" | "name"> };

export function toListItem(p: WithManufacturer): ProductListItem {
  const images = (p.images as ProductImage[] | null) ?? [];
  return {
    id: p.id,
    source: p.source,
    name: p.name,
    slug: p.slug,
    category: p.category,
    manufacturer: { id: p.manufacturer.id, name: p.manufacturer.name },
    supplierPrice: p.supplierPrice == null ? null : Number(p.supplierPrice),
    commissionPct: p.commissionPct == null ? null : Number(p.commissionPct),
    price: Number(p.price),
    currency: p.currency,
    active: p.active,
    inStock: p.inStock,
    image: images[0]?.url ?? null,
  };
}

export function toDetail(p: WithManufacturer): ProductDetail {
  return {
    ...toListItem(p),
    sourceUrl: safeHttpUrl(p.sourceUrl),
    sku: p.sku,
    description: p.description,
    specs: (p.specs as Spec[] | null) ?? [],
    datasheetUrl: safeHttpUrl(p.datasheetUrl),
    images: (p.images as ProductImage[] | null) ?? [],
    lastSyncedAt: p.lastSyncedAt?.toISOString() ?? null,
  };
}

const text = (max: number) => z.string().trim().max(max);
/** Solo http(s): evita guardar `javascript:` u otros esquemas que luego se renderizan en un enlace. */
const httpUrl = z.url({ protocol: /^https?$/ });
const optionalText = (max: number) => text(max).transform((v) => v || null).nullable().optional();

export const specSchema = z.object({ label: text(120).min(1), value: text(500).min(1) });

export const createProductSchema = z.object({
  name: text(200).min(1),
  manufacturerId: z.string().min(1),
  price: z.number().min(0).max(1e10),
  description: optionalText(20_000),
  category: optionalText(120),
  sku: optionalText(80),
  datasheetUrl: httpUrl.nullable().optional(),
  specs: z.array(specSchema).max(100).default([]),
  active: z.boolean().default(true),
  inStock: z.boolean().default(true),
});

/** Productos manuales: todo editable salvo el origen. */
export const updateManualSchema = createProductSchema.partial();

/** Productos importados: el contenido lo manda Autosolar; solo se gestiona la comisión y la visibilidad. */
export const updateImportedSchema = z
  .object({
    commissionPct: z.number().min(0).max(1000).nullable(),
    active: z.boolean(),
    inStock: z.boolean(),
  })
  .partial()
  .strict();

export const manufacturerSchema = z.object({
  name: text(120).min(1),
  website: httpUrl.nullable().optional(),
  logoUrl: httpUrl.nullable().optional(),
});

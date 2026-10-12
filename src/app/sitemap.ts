import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

const urlFor = (lang: string, path: string) => `${SITE_URL}/${lang}${path === "/" ? "" : path}`;
const languages = (path: string) => ({ languages: Object.fromEntries(locales.map((l) => [l, urlFor(l, path)])) });

/** Portada, simulador, catálogo y cada producto vendible, en cada idioma y con sus alternativas hreflang. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [
    { path: "/", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/simulator", changeFrequency: "monthly" as const, priority: 0.9 },
    { path: "/products", changeFrequency: "daily" as const, priority: 0.8 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/security", changeFrequency: "yearly" as const, priority: 0.3 },
  ];
  const entries: MetadataRoute.Sitemap = pages.flatMap((p) =>
    locales.map((l) => ({ url: urlFor(l, p.path), changeFrequency: p.changeFrequency, priority: p.priority, alternates: languages(p.path) })),
  );

  // Sin base de datos (p. ej. al compilar sin credenciales) el mapa sale solo con las páginas fijas.
  const products = await prisma.product
    .findMany({ where: { active: true, price: { gt: 0 } }, select: { slug: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 5000 })
    .catch(() => []);
  for (const p of products) {
    const path = `/products/${p.slug}`;
    for (const l of locales) entries.push({ url: urlFor(l, path), lastModified: p.updatedAt, changeFrequency: "weekly", priority: 0.6, alternates: languages(path) });
  }
  return entries;
}

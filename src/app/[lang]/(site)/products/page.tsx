import { Suspense } from "react";
import type { Metadata } from "next";
import { languageAlternates, ogBase, twitterImages } from "@/lib/site";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { getCatalogPage, getFacets } from "@/lib/catalog";
import { fill, num } from "@/lib/format";
import { CATALOG_PAGE_SIZES, parseCatalogSize } from "@/lib/catalog-page";
import { CatalogPagination } from "@/components/CatalogPagination";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilters } from "@/components/ProductFilters";
import { Button } from "@/components/ui/button";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata({ params }: PageProps<"/[lang]/products">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const m = getDict(lang).meta;
  return {
    title: m.productsTitle,
    description: m.productsDescription,
    // Las páginas filtradas o paginadas (?q=, ?page=) apuntan a la lista base para no duplicar contenido.
    alternates: languageAlternates("/products", lang),
    openGraph: { ...ogBase(lang, getDict(lang).brand), title: m.productsTitle, description: m.productsDescription, url: `/${lang}/products` },
    twitter: { title: m.productsTitle, description: m.productsDescription, images: twitterImages(lang) },
  };
}

async function Listing({ params, searchParams }: Pick<PageProps<"/[lang]/products">, "params" | "searchParams">) {
  const [{ lang }, sp] = await Promise.all([params, searchParams]);
  if (!hasLocale(lang)) notFound();
  const t = getDict(lang);
  const f = { q: one(sp.q).trim().slice(0, 100), category: one(sp.category), manufacturer: one(sp.maker) };
  const page = Math.max(1, Math.floor(Number(one(sp.page))) || 1);
  const size = parseCatalogSize(one(sp.size));
  const [facets, data] = await Promise.all([getFacets(), getCatalogPage({ ...f, page, size })]);
  const s = t.shop;
  const filtered = Boolean(f.q || f.category || f.manufacturer);

  return (
    <>
      <section className="pagehead">
        <div className="wrap">
          <h1>{s.title}</h1>
          <p>{s.sub}</p>
        </div>
      </section>
      <div className="on-light">
        <div className="wrap cat">
          <ProductFilters t={t} lang={lang} facets={facets} initial={{ ...f, size }} />
          <p className="shopcount" role="status">{fill(s.results, { total: num(lang, data.total) })}</p>
          {data.items.length === 0 ? (
            <div className="shopempty">
              <p>{s.empty}</p>
              {filtered && <Button asChild variant="outline" size="sm"><Link href={`/${lang}/products`}>{s.clear}</Link></Button>}
            </div>
          ) : (
            <div className="pgrid">{data.items.map((it) => <ProductCard key={it.slug} item={it} lang={lang} t={t} />)}</div>
          )}
          {data.total > CATALOG_PAGE_SIZES[0] && (
            <CatalogPagination
              lang={lang}
              page={Math.min(page, data.pages)}
              pages={data.pages}
              total={data.total}
              pageSize={data.pageSize}
              filters={{ q: f.q, category: f.category, maker: f.manufacturer }}
              labels={{ rowsPerPage: s.rowsPerPage, prev: s.prev, next: s.next, pageOf: s.pageOf, goTo: s.goTo, nav: s.title }}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default function Page(props: PageProps<"/[lang]/products">) {
  return (
    <Suspense fallback={<div className="pagehead" aria-busy="true" />}>
      <Listing params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

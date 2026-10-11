import { Suspense } from "react";
import type { Metadata } from "next";
import { languageAlternates, ogBase, twitterImages } from "@/lib/site";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { getCatalogPage, getFacets } from "@/lib/catalog";
import { fill } from "@/lib/format";
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
  const [facets, data] = await Promise.all([getFacets(), getCatalogPage({ ...f, page })]);
  const s = t.shop;
  const href = (p: number) => {
    const u = new URLSearchParams();
    if (f.q) u.set("q", f.q);
    if (f.category) u.set("category", f.category);
    if (f.manufacturer) u.set("maker", f.manufacturer);
    if (p > 1) u.set("page", String(p));
    return `/${lang}/products${u.size ? `?${u}` : ""}`;
  };
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
          <ProductFilters t={t} lang={lang} facets={facets} initial={f} />
          <p className="shopcount" role="status">{fill(s.results, { total: data.total })}</p>
          {data.items.length === 0 ? (
            <div className="shopempty">
              <p>{s.empty}</p>
              {filtered && <Button asChild variant="outline" size="sm"><Link href={`/${lang}/products`}>{s.clear}</Link></Button>}
            </div>
          ) : (
            <div className="pgrid">{data.items.map((it) => <ProductCard key={it.slug} item={it} lang={lang} t={t} />)}</div>
          )}
          {data.pages > 1 && (
            <nav className="pager" aria-label={s.title}>
              {page > 1 ? <Button asChild variant="outline" size="sm"><Link href={href(page - 1)}>{s.prev}</Link></Button> : <Button variant="outline" size="sm" disabled>{s.prev}</Button>}
              <span>{fill(s.pageOf, { page: Math.min(page, data.pages), pages: data.pages })}</span>
              {page < data.pages ? <Button asChild variant="outline" size="sm"><Link href={href(page + 1)}>{s.next}</Link></Button> : <Button variant="outline" size="sm" disabled>{s.next}</Button>}
            </nav>
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

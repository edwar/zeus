import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { getCatalogProduct } from "@/lib/catalog";
import { absoluteUrl, jsonLd, languageAlternates, ogBase, twitterImages } from "@/lib/site";
import { money } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductGallery } from "@/components/ProductGallery";

export async function generateMetadata({ params }: PageProps<"/[lang]/products/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const p = await getCatalogProduct(slug);
  if (!p) return {};
  const t = getDict(lang);
  const description = (p.description?.replace(/\s+/g, " ").trim().slice(0, 155) || t.meta.productFallback);
  const image = p.images[0];
  return {
    title: p.name, // la plantilla del layout agrega "· Zeus"
    description,
    alternates: languageAlternates(`/products/${slug}`, lang),
    openGraph: {
      ...ogBase(lang, t.brand),
      title: p.name,
      description,
      url: `/${lang}/products/${slug}`,
      ...(image && { images: [{ url: image, alt: p.name }] }),
    },
    twitter: { title: p.name, description, images: image ? [image] : twitterImages(lang) },
  };
}

async function Detail({ params }: Pick<PageProps<"/[lang]/products/[slug]">, "params">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const p = await getCatalogProduct(slug);
  if (!p) notFound();
  const t = getDict(lang);
  const s = t.shop;

  // Datos estructurados para que el buscador muestre precio y disponibilidad. El precio es de referencia.
  const structured = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    ...(p.description && { description: p.description.replace(/\s+/g, " ").trim().slice(0, 500) }),
    ...(p.images.length && { image: p.images.slice(0, 4) }),
    ...(p.sku && { sku: p.sku }),
    ...(p.manufacturer && { brand: { "@type": "Brand", name: p.manufacturer } }),
    ...(p.category && { category: p.category }),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/${lang}/products/${slug}`),
      priceCurrency: p.currency,
      price: p.price,
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="on-light">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <div className="wrap pdetail">
        <Link href={`/${lang}/products`} className="back">← {s.back}</Link>
        <div className="pdetail__grid">
          <div className="pdetail__media">
            {p.images.length ? (
              <ProductGallery images={p.images} name={p.name} label={s.gallery} />
            ) : (
              <div className="pcard__media pdetail__main"><span className="pcard__noimg">{s.noImage}</span></div>
            )}
          </div>

          <div className="pdetail__info">
            <p className="pcard__maker">{p.manufacturer}{p.category && ` · ${p.category}`}</p>
            <h1 className="pdetail__title">{p.name}</h1>
            <div className="pdetail__buy">
              <strong className="pdetail__price">{money(lang, p.price, p.currency)}</strong>
              <Badge variant={p.inStock ? "default" : "warning"}>{p.inStock ? s.inStock : s.outOfStock}</Badge>
            </div>
            <p className="pdetail__note">{s.priceNote}</p>
            <div className="pdetail__cta">
              {p.datasheetUrl && <Button asChild variant="outline"><a href={p.datasheetUrl} target="_blank" rel="noopener noreferrer">{s.datasheet}</a></Button>}
            </div>
            {p.sku && <p className="pdetail__sku">{s.sku}: {p.sku}</p>}
          </div>
        </div>

        {(p.description || p.specs.length > 0) && (
          <div className="pdetail__more">
            {p.description && (
              <section>
                <h2>{s.description}</h2>
                <p className="pdetail__desc">{p.description}</p>
              </section>
            )}
            {p.specs.length > 0 && (
              <section>
                <h2>{s.specs}</h2>
                <dl className="pspecs pspecs--site">{p.specs.map((x) => <div key={x.label}><dt>{x.label}</dt><dd>{x.value}</dd></div>)}</dl>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page({ params }: PageProps<"/[lang]/products/[slug]">) {
  return (
    <Suspense fallback={<div className="wrap pdetail" aria-busy="true" />}>
      <Detail params={params} />
    </Suspense>
  );
}

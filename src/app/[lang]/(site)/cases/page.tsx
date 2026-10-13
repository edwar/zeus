import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { getPublishedCases } from "@/lib/cases-data";
import { languageAlternates, ogBase, twitterImages } from "@/lib/site";
import { CaseCard } from "@/components/CaseCard";

export async function generateMetadata({ params }: PageProps<"/[lang]/cases">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const k = getDict(lang).cases;
  return {
    title: k.metaTitle,
    description: k.metaDesc,
    alternates: languageAlternates("/cases", lang),
    openGraph: { ...ogBase(lang, getDict(lang).brand), title: k.metaTitle, description: k.metaDesc, url: `/${lang}/cases` },
    twitter: { title: k.metaTitle, description: k.metaDesc, images: twitterImages(lang) },
  };
}

async function List({ params }: Pick<PageProps<"/[lang]/cases">, "params">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const cases = await getPublishedCases().catch(() => []);
  // Sin casos publicados no hay página: no se muestra una lista vacía ni de ejemplo.
  if (cases.length === 0) notFound();
  const t = getDict(lang);
  return (
    <>
      <section className="pagehead">
        <div className="wrap">
          <h1>{t.cases.title}</h1>
          <p>{t.cases.sub}</p>
        </div>
      </section>
      <div className="on-light">
        <div className="wrap cases">
          <ul className="casecards">{cases.map((c) => <CaseCard key={c.slug} t={t} lang={lang} c={c} />)}</ul>
          <p className="cases__note">{t.cases.disclaimer}</p>
        </div>
      </div>
    </>
  );
}

export default function Page({ params }: PageProps<"/[lang]/cases">) {
  return <Suspense fallback={null}><List params={params} /></Suspense>;
}

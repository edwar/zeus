import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { pick } from "@/lib/cases";
import { getPublishedCase } from "@/lib/cases-data";
import { languageAlternates, ogBase, twitterImages } from "@/lib/site";
import { CaseDetail } from "@/components/CaseDetail";

export async function generateMetadata({ params }: PageProps<"/[lang]/cases/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const c = await getPublishedCase(slug).catch(() => null);
  if (!c) return {};
  const title = pick(lang, c.titleEs, c.titleEn);
  const description = pick(lang, c.summaryEs, c.summaryEn).slice(0, 155);
  const image = c.photos[0]?.url;
  return {
    title,
    description,
    alternates: languageAlternates(`/cases/${slug}`, lang),
    openGraph: { ...ogBase(lang, getDict(lang).brand), title, description, url: `/${lang}/cases/${slug}`, ...(image && { images: [{ url: image, alt: title }] }) },
    twitter: { title, description, images: image ? [image] : twitterImages(lang) },
  };
}

async function Detail({ params }: Pick<PageProps<"/[lang]/cases/[slug]">, "params">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const c = await getPublishedCase(slug).catch(() => null);
  if (!c) notFound();
  return <CaseDetail t={getDict(lang)} lang={lang} c={c} />;
}

export default function Page({ params }: PageProps<"/[lang]/cases/[slug]">) {
  return <Suspense fallback={null}><Detail params={params} /></Suspense>;
}

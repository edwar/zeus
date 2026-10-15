import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { LegalDocument } from "@/components/LegalDocument";
import { terms } from "@/lib/legal/terms";
import { languageAlternates, ogBase, twitterImages } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const d = terms[lang];
  return {
    title: d.title,
    description: d.description,
    alternates: languageAlternates("/terms", lang),
    openGraph: { ...ogBase(lang, getDict(lang).brand), title: d.title, description: d.description, url: `/${lang}/terms` },
    twitter: { title: d.title, description: d.description, images: twitterImages(lang) },
  };
}

export default async function Page({ params }: PageProps<"/[lang]/terms">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <LegalDocument doc={terms[lang]} lang={lang} />;
}

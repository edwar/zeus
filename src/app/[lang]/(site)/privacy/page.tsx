import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { LegalDocument } from "@/components/LegalDocument";
import { privacy } from "@/lib/legal/privacy";
import { languageAlternates, ogBase, twitterImages } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const d = privacy[lang];
  return {
    title: d.title,
    description: d.description,
    alternates: languageAlternates("/privacy", lang),
    openGraph: { ...ogBase(lang, getDict(lang).brand), title: d.title, description: d.description, url: `/${lang}/privacy` },
    twitter: { title: d.title, description: d.description, images: twitterImages(lang) },
  };
}

export default async function Page({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <LegalDocument doc={privacy[lang]} lang={lang} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { LegalDocument } from "@/components/LegalDocument";
import { security } from "@/lib/legal/security";
import { languageAlternates, ogBase, twitterImages } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/security">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const d = security[lang];
  return {
    title: d.title,
    description: d.description,
    alternates: languageAlternates("/security", lang),
    openGraph: { ...ogBase(lang, getDict(lang).brand), title: d.title, description: d.description, url: `/${lang}/security` },
    twitter: { title: d.title, description: d.description, images: twitterImages(lang) },
  };
}

export default async function Page({ params }: PageProps<"/[lang]/security">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <LegalDocument doc={security[lang]} lang={lang} />;
}

import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import type { Metadata } from "next";
import { BillWizard } from "@/components/BillWizard";
import { languageAlternates, ogBase, twitterImages } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/simulator">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const m = getDict(lang).meta;
  return {
    title: m.simulatorTitle,
    description: m.simulatorDescription,
    alternates: languageAlternates("/simulator", lang),
    openGraph: { ...ogBase(lang, getDict(lang).brand), title: m.simulatorTitle, description: m.simulatorDescription, url: `/${lang}/simulator` },
    twitter: { title: m.simulatorTitle, description: m.simulatorDescription, images: twitterImages(lang) },
  };
}

export default async function Page({ params }: PageProps<"/[lang]/simulator">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDict(lang);
  return (
    <>
      <section className="pagehead">
        <div className="wrap">
          <h1>{t.sim.title}</h1>
          <p>{t.sim.sub}</p>
        </div>
      </section>
      <div className="on-light">
        <BillWizard t={t} lang={lang} />
      </div>
    </>
  );
}

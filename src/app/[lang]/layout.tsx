import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, locales } from "@/i18n/config";
import { getDict } from "@/i18n";
import { Providers } from "@/components/Providers";
import { INDEXABLE, SITE_URL, languageAlternates } from "@/lib/site";
import { fontClasses } from "../fonts";
import "../tailwind.css";

export const viewport: Viewport = { themeColor: "#ffc21a", colorScheme: "light" };

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getDict(lang);
  const m = t.meta;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: m.title, template: `%s · ${t.brand}` },
    description: m.description,
    applicationName: t.brand,
    keywords: m.keywords,
    category: "energy",
    // Cada página sobrescribe `alternates` con su propia ruta; esta es la de la portada.
    alternates: languageAlternates("/", lang),
    openGraph: {
      type: "website",
      siteName: t.brand,
      title: m.title,
      description: m.description,
      locale: lang === "es" ? "es_CO" : "en_US",
      alternateLocale: lang === "es" ? ["en_US"] : ["es_CO"],
      url: `/${lang}`,
    },
    twitter: { card: "summary_large_image", title: m.title, description: m.description },
    robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <html lang={lang} className={fontClasses}>
      <body><Providers confirm={getDict(lang).app.confirm}>{children}</Providers></body>
    </html>
  );
}

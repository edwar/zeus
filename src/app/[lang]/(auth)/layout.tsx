import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { Logo, LocaleSwitch } from "@/components/SiteHeader";

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: { absolute: getDict(lang).auth.title }, robots: { index: false, follow: false }, alternates: {} };
}

export default async function AuthLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDict(lang);
  return (
    <div className="auth">
      <header className="auth__top">
        <Link href={`/${lang}`} className="brand"><Logo /><span>{t.brand}</span></Link>
        <LocaleSwitch lang={lang} label={t.nav.language} />
      </header>
      <main className="auth__main">{children}</main>
    </div>
  );
}

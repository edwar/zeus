import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { SiteHeader, Logo } from "@/components/SiteHeader";
import { SiteAuthButton } from "@/components/SiteAuthButton";
import { SourceCapture } from "@/components/SourceCapture";

export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDict(lang);
  return (
    <div className="site">
      <a href="#main" className="skip">{t.nav.skip}</a>
      {/* usePathname() es dato de la URL: sin Suspense las rutas dinámicas (p. ej. /products/[slug]) no se pueden prerenderizar. */}
      <Suspense
        fallback={
          <header className="sitehead">
            <div className="wrap sitehead__bar">
              <Link href={`/${lang}`} className="brand" aria-label={`${t.brand} · ${t.nav.home}`}><Logo /><span>{t.brand}</span></Link>
            </div>
          </header>
        }
      >
        <SiteHeader lang={lang} t={t} cta={<SiteAuthButton lang={lang} t={t} />} />
      </Suspense>
      <Suspense fallback={null}><SourceCapture /></Suspense>
      <main id="main">{children}</main>
      <footer className="sitefoot">
        <div className="wrap sitefoot__in">
          <Link href={`/${lang}`} className="brand"><Logo /><span>{t.brand}</span></Link>
          <p className="sitefoot__note">{t.footer.note}</p>
          <nav className="sitefoot__links" aria-label={t.footer.legal}>
            <Link href={`/${lang}/privacy`}>{t.footer.privacy}</Link>
            <Link href={`/${lang}/security`}>{t.footer.security}</Link>
            <Link href={`/${lang}/terms`}>{t.footer.terms}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

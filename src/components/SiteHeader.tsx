"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";
import { Button } from "@/components/ui/button";

export function Logo() {
  return (
    <span className="logo" aria-hidden="true">
      <svg viewBox="0 0 28 28" width="28" height="28">
        <rect x="0" y="0" width="28" height="28" rx="3" fill="#f5b82e" />
        <rect x="4" y="0" width="4" height="28" fill="#082017" />
        <rect x="12" y="0" width="4" height="28" fill="#082017" />
        <rect x="20" y="0" width="4" height="28" fill="#082017" />
      </svg>
    </span>
  );
}

export function LocaleSwitch({ lang, label }: { lang: Locale; label: string }) {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(es|en)/, "") || "";
  return (
    <div className="locale" role="group" aria-label={label}>
      {locales.map((l) => (
        <Link key={l} href={`/${l}${rest}`} lang={l} aria-current={l === lang ? "true" : undefined} className="locale__opt">
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}

export function SiteHeader({ lang, t, cta }: { lang: Locale; t: Dict; cta: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = [
    { href: `/${lang}/simulator`, label: t.nav.simulator },
    { href: `/${lang}/products`, label: t.nav.products },
  ];
  return (
    <header className="sitehead">
      <div className="wrap sitehead__bar">
        <Link href={`/${lang}`} className="brand" aria-label={`${t.brand} · ${t.nav.home}`}>
          <Logo />
          <span>{t.brand}</span>
        </Link>
        <nav className={`sitenav ${open ? "is-open" : ""}`} aria-label="Principal" id="sitenav">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={pathname.startsWith(l.href) ? "page" : undefined} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <LocaleSwitch lang={lang} label={t.nav.language} />
          {cta}
        </nav>
        <button type="button" className="menubtn" aria-expanded={open} aria-controls="sitenav" onClick={() => setOpen((v) => !v)}>
          <span className="sr-only">{open ? t.nav.close : t.nav.menu}</span>
          <span aria-hidden="true" className="menubtn__bars" />
        </button>
      </div>
    </header>
  );
}

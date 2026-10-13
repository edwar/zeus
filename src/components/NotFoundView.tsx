"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { defaultLocale, hasLocale, type Locale } from "@/i18n/config";
import { SunBurst } from "@/components/Scenes";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SiteCopy = { title: string; text: string; home: string; simulator: string };
type AppCopy = { title: string; text: string; home: string; site: string };
export type NotFoundCopy = { eyebrow: string; site: Record<Locale, SiteCopy>; app: Record<Locale, AppCopy> };

/**
 * Página 404 con la identidad de Zeus. Un not-found de Next no recibe `params`, así que el idioma sale del primer
 * segmento de la URL (el proxy siempre la prefija) y las dos traducciones viajan juntas: son pocas palabras.
 */
export function NotFoundView({ copy, variant }: { copy: NotFoundCopy; variant: "site" | "app" }) {
  const seg = usePathname().split("/")[1] ?? "";
  const lang: Locale = hasLocale(seg) ? seg : defaultLocale;
  const c = copy[variant][lang];
  const s = copy.site[lang];
  const links = variant === "app"
    ? [{ href: `/${lang}/app`, label: c.home, primary: true }, { href: `/${lang}`, label: (c as AppCopy).site }]
    : [{ href: `/${lang}`, label: c.home, primary: true }, { href: `/${lang}/simulator`, label: s.simulator }];
  return (
    <section className={cn("nf", variant === "app" && "nf--app")} aria-labelledby="nf-title">
      <div className="nf__code" aria-hidden="true">
        <span>4</span>
        <SunBurst className="nf__sun" />
        <span>4</span>
      </div>
      <p className="nf__eyebrow">{copy.eyebrow}</p>
      <h1 id="nf-title" className="nf__title">{c.title}</h1>
      <p className="nf__text">{c.text}</p>
      <div className="nf__actions">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={buttonVariants({ variant: l.primary ? "default" : "outline" })}>{l.label}</Link>
        ))}
      </div>
    </section>
  );
}

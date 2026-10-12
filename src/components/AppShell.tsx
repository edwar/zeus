"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { Logo, LocaleSwitch } from "./SiteHeader";
import { authClient } from "@/lib/auth-client";
import { can, homeFor, type Perm, type Role } from "@/lib/roles";
import { RoleProvider } from "@/components/RoleContext";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const icons: Record<string, React.ReactNode> = {
  projects: <path d="M3 4h5v16H3zM10 4h5v10h-5zM17 4h4v13h-4z" />,
  products: <path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10" />,
  makers: <path d="M4 21V9l6 4V9l6 4V5h4v16zM8 17h2M14 17h2" />,
  teams: <path d="M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />,
  quotes: <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM8 8h8M8 12h8M8 16h5" />,
  users: <path d="M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 016-6h2a6 6 0 016 6v1M17 3.2a4 4 0 010 7.6M22 21v-1a6 6 0 00-4-5.6" />,
};

export function AppShell({ lang, t, user, children }: { lang: Locale; t: Dict; user: { name: string; role: Role }; children: React.ReactNode }) {
  const pathname = usePathname();
  const [pwOpen, setPwOpen] = useState(false);
  const signOut = async () => {
    await authClient.signOut();
    // Navegación completa: evita que el caché del router conserve páginas de la sesión cerrada.
    window.location.replace(`/${lang}`);
  };
  const base = `/${lang}/app`;
  // Cada entrada se muestra solo si el rol tiene el permiso (el servidor lo vuelve a exigir en cada ruta).
  const all: { key: string; seg: string; label: string; perm: Perm }[] = [
    { key: "quotes", seg: "quotes", label: t.app.nav.quotes, perm: "quotes" },
    { key: "projects", seg: "projects", label: t.app.nav.projects, perm: "projects.view" },
    { key: "teams", seg: "teams", label: t.app.nav.teams, perm: "teams.view" },
    { key: "products", seg: "products", label: t.app.nav.products, perm: "catalog" },
    { key: "makers", seg: "manufacturers", label: t.app.nav.makers, perm: "catalog" },
    { key: "users", seg: "users", label: t.app.nav.users, perm: "users" },
  ];
  const items = all
    .filter((i) => can(user.role, i.perm))
    .map((i) => ({ key: i.key, href: `${base}/${i.seg}`, label: i.label, match: (p: string) => p.startsWith(`${base}/${i.seg}`) }));
  return (
    <RoleProvider value={user.role}>
    <div className="app">
      <a href="#appmain" className="skip">{t.nav.skip}</a>
      <aside className="app__side">
        <Link href={homeFor(user.role, lang)} className="app__brand">
          <Logo />
          <span>{t.app.brand}</span>
        </Link>
        <nav aria-label="Principal" className="app__nav">
          {items.map((i) => (
            <Link key={i.key} href={i.href} aria-current={i.match(pathname) ? "page" : undefined} className="app__link">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">{icons[i.key]}</svg>
              <span>{i.label}</span>
            </Link>
          ))}
        </nav>
        <div className="app__side-foot">
          <div className="app__foot-row">
            <Link href={`/${lang}`} className="app__foot-link">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" /></svg>
              <span>{t.app.nav.site}</span>
            </Link>
            <LocaleSwitch lang={lang} label={t.nav.language} />
          </div>
          <div className="app__account">
            <span className="app__avatar" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</span>
            <span className="app__user">{user.name}</span>
            <button type="button" className="app__exit" onClick={() => setPwOpen(true)} aria-haspopup="dialog" aria-label={t.auth.changeTitle} title={t.auth.changeTitle}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3M14 9l2 2" /></svg>
            </button>
            <button type="button" className="app__exit" onClick={signOut} aria-label={t.auth.signOut} title={t.auth.signOut}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><path d="M10 4H5v16h5M16 8l4 4-4 4M20 12H9" /></svg>
            </button>
          </div>
        </div>
      </aside>
      <div className="app__top">
        <Link href={homeFor(user.role, lang)} className="app__brand"><Logo /><span>{t.app.brand}</span></Link>
        <LocaleSwitch lang={lang} label={t.nav.language} />
        <button type="button" className="app__signout" onClick={() => setPwOpen(true)} aria-haspopup="dialog">{t.auth.changeTitle}</button>
        <button type="button" className="app__signout" onClick={signOut}>{t.auth.signOut}</button>
      </div>
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.auth.changeTitle}</DialogTitle>
            <DialogDescription>{t.auth.resetSub}</DialogDescription>
          </DialogHeader>
          <ChangePasswordForm t={t} />
        </DialogContent>
      </Dialog>
      <main id="appmain" className="app__main">{children}</main>
      <nav aria-label="Principal" className="app__tabs">
        {items.map((i) => (
          <Link key={i.key} href={i.href} aria-current={i.match(pathname) ? "page" : undefined} className="app__tab">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">{icons[i.key]}</svg>
            <span>{i.label}</span>
          </Link>
        ))}
      </nav>
    </div>
    </RoleProvider>
  );
}

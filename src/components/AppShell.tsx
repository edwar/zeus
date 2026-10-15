"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useDueCount } from "@/hooks/useCrm";
import { AccountMenu } from "@/components/AccountMenu";
import { MoreMenu } from "@/components/MoreMenu";
import { clearFieldData } from "@/lib/field-db";
import { ExitIcon, GuideIcon, KeyIcon } from "@/components/AppIcons";
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
  leads: <path d="M12 3a6 6 0 00-6 6c0 5-2 6-2 6h16s-2-1-2-6a6 6 0 00-6-6zM10 19a2 2 0 004 0" />,
  field: <path d="M12 3a4 4 0 00-4 4v3H6a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2h-2V7a4 4 0 00-4-4zM9.5 7a2.5 2.5 0 015 0v3h-5zM12 14.5v3" />,
  stock: <path d="M3 8l9-5 9 5v11a1 1 0 01-1 1H4a1 1 0 01-1-1zM3 8l9 5 9-5M12 13v8" />,
  cases: <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.3 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" />,
  quotes: <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM8 8h8M8 12h8M8 16h5" />,
  users: <path d="M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 016-6h2a6 6 0 016 6v1M17 3.2a4 4 0 010 7.6M22 21v-1a6 6 0 00-4-5.6" />,
};

export function AppShell({ lang, t, user, children }: { lang: Locale; t: Dict; user: { name: string; role: Role }; children: React.ReactNode }) {
  const pathname = usePathname();
  const [pwOpen, setPwOpen] = useState(false);
  const signOut = async () => {
    // Lo guardado para trabajar sin señal (proyectos, cola, fotos) no se queda en el teléfono al cerrar sesión.
    await clearFieldData(true);
    await authClient.signOut();
    // Navegación completa: evita que el caché del router conserve páginas de la sesión cerrada.
    window.location.replace(`/${lang}`);
  };
  const base = `/${lang}/app`;
  // Recordatorios propios vencidos o de hoy: insignia en «Seguimiento».
  const due = useDueCount(can(user.role, "quotes")).data?.due ?? 0;
  // Cada entrada se muestra solo si el rol tiene el permiso (el servidor lo vuelve a exigir en cada ruta).
  const all: { key: string; seg: string; label: string; perm: Perm }[] = [
    { key: "quotes", seg: "quotes", label: t.app.nav.quotes, perm: "quotes" },
    { key: "projects", seg: "projects", label: t.app.nav.projects, perm: "projects.view" },
    { key: "leads", seg: "leads", label: t.app.nav.leads, perm: "quotes" },
    { key: "cases", seg: "cases", label: t.app.nav.cases, perm: "cases" },
    // Modo campo en el menú solo para quien trabaja en obra (el rol equipo); gestión y administración lo abren desde cada proyecto.
    ...(can(user.role, "projects.progress") && !can(user.role, "quotes") ? [{ key: "field", seg: "field", label: t.app.nav.field, perm: "projects.progress" as Perm }] : []),
    { key: "teams", seg: "teams", label: t.app.nav.teams, perm: "teams.view" },
    { key: "stock", seg: "stock", label: t.app.nav.stock, perm: "stock" },
    { key: "products", seg: "products", label: t.app.nav.products, perm: "catalog" },
    { key: "makers", seg: "manufacturers", label: t.app.nav.makers, perm: "catalog" },
    { key: "users", seg: "users", label: t.app.nav.users, perm: "users" },
  ];
  const items = all
    .filter((i) => can(user.role, i.perm))
    .map((i) => ({ key: i.key, href: `${base}/${i.seg}`, label: i.label, match: (p: string) => p.startsWith(`${base}/${i.seg}`) }));
  // Escritorio: guía, cambiar contraseña y cerrar sesión como tres iconos al final de la barra lateral (con nombre accesible y tooltip).
  const tools = (
    <>
      <Link href={`${base}/guide`} className="app__icon" aria-label={t.app.nav.guide} title={t.app.nav.guide} aria-current={pathname.startsWith(`${base}/guide`) ? "page" : undefined}><GuideIcon /></Link>
      <button type="button" className="app__icon" onClick={() => setPwOpen(true)} aria-haspopup="dialog" aria-label={t.auth.changeTitle} title={t.auth.changeTitle}><KeyIcon /></button>
      <button type="button" className="app__icon" onClick={signOut} aria-label={t.auth.signOut} title={t.auth.signOut}><ExitIcon /></button>
    </>
  );
  // Barra inferior (móvil): máximo 5 lugares. Si hay más secciones, las 4 más importantes quedan a la vista y el último lugar es «Más».
  const MAX_TABS = 5;
  const PRIORITY = ["quotes", "projects", "leads", "cases", "field", "teams", "stock", "products", "makers", "users"];
  const rank = (k: string) => (PRIORITY.indexOf(k) < 0 ? 99 : PRIORITY.indexOf(k));
  const keep = items.length > MAX_TABS ? new Set([...items].sort((a, b) => rank(a.key) - rank(b.key)).slice(0, MAX_TABS - 1).map((i) => i.key)) : null;
  const shown = keep ? items.filter((i) => keep.has(i.key)) : items;
  const more = keep ? [...items].filter((i) => !keep.has(i.key)).sort((a, b) => rank(a.key) - rank(b.key)) : [];
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
              {i.key === "leads" && due > 0 && <span className="app__badge" aria-label={`${due} ${t.app.crm.reminders.today.toLowerCase()}`}>{due}</span>}
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
          </div>
          <div className="app__tools">{tools}</div>
        </div>
      </aside>
      <div className="app__top">
        <Link href={homeFor(user.role, lang)} className="app__brand"><Logo /><span>{t.app.brand}</span></Link>
        <LocaleSwitch lang={lang} label={t.nav.language} />
        <AccountMenu t={t} name={user.name} guideHref={`${base}/guide`} onChangePassword={() => setPwOpen(true)} onSignOut={signOut} />
      </div>
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.auth.changeTitle}</DialogTitle>
            <DialogDescription>{t.auth.resetSub}</DialogDescription>
          </DialogHeader>
          <ChangePasswordForm t={t} onDone={() => setTimeout(() => setPwOpen(false), 1500)} />
        </DialogContent>
      </Dialog>
      <main id="appmain" className="app__main">{children}</main>
      <nav aria-label="Principal" className="app__tabs">
        {shown.map((i) => (
          <Link key={i.key} href={i.href} aria-current={i.match(pathname) ? "page" : undefined} className="app__tab">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">{icons[i.key]}</svg>
            <span>{i.label}</span>
            {i.key === "leads" && due > 0 && <span className="app__dot" role="img" aria-label={`${due} ${t.app.crm.reminders.today.toLowerCase()}`} />}
          </Link>
        ))}
        {more.length > 0 && <MoreMenu label={t.app.nav.more} items={more.map((i) => ({ key: i.key, href: i.href, label: i.label, active: i.match(pathname), icon: icons[i.key] }))} />}
      </nav>
    </div>
    </RoleProvider>
  );
}

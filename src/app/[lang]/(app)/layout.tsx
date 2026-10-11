import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/session";
import { normalizeRole } from "@/lib/roles";

// La sesión es dato de la petición: se lee dentro de Suspense para no bloquear el resto de la ruta.
async function Authed({ lang, children }: { lang: Locale; children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect(`/${lang}/login`);
  const { name, role } = session.user;
  return <AppShell lang={lang} t={getDict(lang)} user={{ name, role: normalizeRole(role) }}>{children}</AppShell>;
}

// Zona interna: ni se indexa ni se sigue, aunque alguien comparta un enlace.
export const metadata: Metadata = { title: { absolute: "Zeus Ops" }, robots: { index: false, follow: false }, alternates: {} };

export default async function AppLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <Suspense fallback={null}>
      <Authed lang={lang}>{children}</Authed>
    </Suspense>
  );
}

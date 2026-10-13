import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { findPortalProject } from "@/lib/portal";
import { ProjectPortal } from "@/components/ProjectPortal";

// Página privada de un cliente: nunca se indexa ni se prerenderiza (depende de la firma y del estado actual del proyecto).
export async function generateMetadata({ params }: PageProps<"/[lang]/p/[ref]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: getDict(lang).portal.metaTitle, robots: { index: false, follow: false }, referrer: "no-referrer", alternates: {} };
}

async function Resolve({ params }: Pick<PageProps<"/[lang]/p/[ref]">, "params">) {
  const { lang, ref } = await params;
  if (!hasLocale(lang)) notFound();
  const view = await findPortalProject(ref, lang);
  if (!view) notFound();
  return <ProjectPortal t={getDict(lang)} lang={lang} urlRef={ref} view={view} />;
}

export default function Page({ params }: PageProps<"/[lang]/p/[ref]">) {
  return <Suspense fallback={null}><Resolve params={params} /></Suspense>;
}

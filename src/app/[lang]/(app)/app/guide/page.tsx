import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { INDEX_SLUG, listGuide, readGuide } from "@/lib/guide";
import { GuideDoc } from "@/components/GuideDoc";

// Abierta a todos los roles del panel (la sesión ya la exige el layout de /app): la guía también es para el equipo de instalación.
async function Resolve({ params }: Pick<PageProps<"/[lang]/app/guide">, "params">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [doc, list] = await Promise.all([readGuide(INDEX_SLUG), listGuide()]);
  if (!doc) notFound();
  return <GuideDoc t={getDict(lang)} lang={lang} doc={doc} list={list} />;
}

export default function Page({ params }: PageProps<"/[lang]/app/guide">) {
  return <Suspense fallback={null}><Resolve params={params} /></Suspense>;
}

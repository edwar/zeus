import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { listGuide, readGuide } from "@/lib/guide";
import { GuideDoc } from "@/components/GuideDoc";

async function Resolve({ params }: Pick<PageProps<"/[lang]/app/guide/[slug]">, "params">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const [doc, list] = await Promise.all([readGuide(slug), listGuide()]);
  if (!doc) notFound();
  return <GuideDoc t={getDict(lang)} lang={lang} doc={doc} list={list} />;
}

export default function Page({ params }: PageProps<"/[lang]/app/guide/[slug]">) {
  return <Suspense fallback={null}><Resolve params={params} /></Suspense>;
}

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { QuoteDetailView } from "@/components/QuotesManager";

async function Resolve({ params }: Pick<PageProps<"/[lang]/app/quotes/[id]">, "params">) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  return <QuoteDetailView t={getDict(lang)} lang={lang} id={id} />;
}

export default function Page({ params }: PageProps<"/[lang]/app/quotes/[id]">) {
  return <Suspense fallback={null}><Resolve params={params} /></Suspense>;
}

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { QuotesList } from "@/components/QuotesManager";

async function Resolve({ params }: Pick<PageProps<"/[lang]/app/quotes">, "params">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <QuotesList t={getDict(lang)} lang={lang} />;
}

export default function Page({ params }: PageProps<"/[lang]/app/quotes">) {
  return <Suspense fallback={null}><Resolve params={params} /></Suspense>;
}

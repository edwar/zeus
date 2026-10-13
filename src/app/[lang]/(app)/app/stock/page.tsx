import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { StockManager } from "@/components/StockManager";

async function Resolve({ params }: Pick<PageProps<"/[lang]/app/stock">, "params">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <StockManager t={getDict(lang)} lang={lang} />;
}

export default function Page({ params }: PageProps<"/[lang]/app/stock">) {
  return <Suspense fallback={null}><Resolve params={params} /></Suspense>;
}

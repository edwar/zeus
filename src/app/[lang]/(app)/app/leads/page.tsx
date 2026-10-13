import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { CrmHome } from "@/components/CrmManager";

async function Resolve({ params }: Pick<PageProps<"/[lang]/app/leads">, "params">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <CrmHome t={getDict(lang)} lang={lang} />;
}

export default function Page({ params }: PageProps<"/[lang]/app/leads">) {
  return <Suspense fallback={null}><Resolve params={params} /></Suspense>;
}

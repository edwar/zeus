import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { CaseEditor } from "@/components/CasesManager";

async function Resolve({ params }: Pick<PageProps<"/[lang]/app/cases/new">, "params">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <CaseEditor t={getDict(lang)} lang={lang} />;
}

export default function Page({ params }: PageProps<"/[lang]/app/cases/new">) {
  return <Suspense fallback={null}><Resolve params={params} /></Suspense>;
}

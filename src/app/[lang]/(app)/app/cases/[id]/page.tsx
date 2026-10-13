import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { CaseEditor } from "@/components/CasesManager";

async function Resolve({ params }: Pick<PageProps<"/[lang]/app/cases/[id]">, "params">) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  return <CaseEditor t={getDict(lang)} lang={lang} id={id} />;
}

export default function Page({ params }: PageProps<"/[lang]/app/cases/[id]">) {
  return <Suspense fallback={null}><Resolve params={params} /></Suspense>;
}

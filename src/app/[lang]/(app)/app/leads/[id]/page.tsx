import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { LeadDetailView } from "@/components/CrmManager";

async function Resolve({ params }: Pick<PageProps<"/[lang]/app/leads/[id]">, "params">) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  return <LeadDetailView t={getDict(lang)} lang={lang} id={id} />;
}

export default function Page({ params }: PageProps<"/[lang]/app/leads/[id]">) {
  return <Suspense fallback={null}><Resolve params={params} /></Suspense>;
}

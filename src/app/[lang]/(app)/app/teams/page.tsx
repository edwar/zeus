import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { TeamsList } from "@/components/TeamsManager";

async function Resolve({ params }: Pick<PageProps<"/[lang]/app/teams">, "params">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <TeamsList t={getDict(lang)} lang={lang} />;
}

export default function Page({ params }: PageProps<"/[lang]/app/teams">) {
  return <Suspense fallback={null}><Resolve params={params} /></Suspense>;
}

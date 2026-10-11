import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { ManufacturersManager } from "@/components/ManufacturersManager";
import { getSession } from "@/lib/session";

async function Content({ lang }: { lang: Locale }) {
  const session = await getSession();
  return <ManufacturersManager t={getDict(lang)} isAdmin={session?.user.role === "admin"} />;
}

async function Resolve({ params }: Pick<PageProps<"/[lang]/app/manufacturers">, "params">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <Content lang={lang} />;
}

export default function Page({ params }: PageProps<"/[lang]/app/manufacturers">) {
  return <Suspense fallback={null}><Resolve params={params} /></Suspense>;
}

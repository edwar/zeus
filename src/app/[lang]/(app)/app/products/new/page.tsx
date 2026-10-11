import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { ProductEditor } from "@/components/ProductEditor";
import { getSession } from "@/lib/session";

async function Content({ lang }: { lang: Locale }) {
  const session = await getSession();
  return <ProductEditor t={getDict(lang)} lang={lang} isAdmin={session?.user.role === "admin"} />;
}

async function Resolve({ params }: Pick<PageProps<"/[lang]/app/products/new">, "params">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <Content lang={lang} />;
}

export default function Page({ params }: PageProps<"/[lang]/app/products/new">) {
  return <Suspense fallback={null}><Resolve params={params} /></Suspense>;
}

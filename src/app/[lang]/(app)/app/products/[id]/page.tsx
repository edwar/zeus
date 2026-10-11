import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { ProductEditor } from "@/components/ProductEditor";
import { getSession } from "@/lib/session";

async function Content({ lang, id }: { lang: Locale; id: string }) {
  const session = await getSession();
  return <ProductEditor id={id} t={getDict(lang)} lang={lang} isAdmin={session?.user.role === "admin"} />;
}

async function Resolve({ params }: Pick<PageProps<"/[lang]/app/products/[id]">, "params">) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  return <Content lang={lang} id={id} />;
}

export default function Page({ params }: PageProps<"/[lang]/app/products/[id]">) {
  return <Suspense fallback={null}><Resolve params={params} /></Suspense>;
}

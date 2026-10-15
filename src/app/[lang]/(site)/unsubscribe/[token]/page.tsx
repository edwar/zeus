import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { readUnsubscribeToken } from "@/lib/unsubscribe";
import { maskEmail } from "@/lib/format";
import { UnsubscribeForm } from "@/components/UnsubscribeForm";

// Página de una sola persona: nunca se indexa y no deja el enlace en el encabezado Referer.
export async function generateMetadata({ params }: PageProps<"/[lang]/unsubscribe/[token]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: getDict(lang).unsubscribe.metaTitle, robots: { index: false, follow: false }, referrer: "no-referrer", alternates: {} };
}

async function Resolve({ params }: Pick<PageProps<"/[lang]/unsubscribe/[token]">, "params">) {
  const { lang, token } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDict(lang);
  const email = readUnsubscribeToken(token);
  return (
    <section className="wrap unsub" aria-labelledby="unsub-title">
      <h1 id="unsub-title" className="auth__title">{t.unsubscribe.title}</h1>
      {email ? <UnsubscribeForm t={t} token={token} maskedEmail={maskEmail(email)} /> : <p>{t.unsubscribe.invalid}</p>}
      <p><Link href={`/${lang}`}>{t.unsubscribe.home}</Link></p>
    </section>
  );
}

export default function Page({ params }: PageProps<"/[lang]/unsubscribe/[token]">) {
  return <Suspense fallback={null}><Resolve params={params} /></Suspense>;
}

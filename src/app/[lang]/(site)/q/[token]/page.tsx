import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { findSharedQuote } from "@/lib/quote-doc";
import { QuoteLink } from "@/components/QuoteLink";

// Página privada de un cliente: nunca se indexa ni se prerenderiza (depende del token y del estado actual).
export async function generateMetadata({ params }: PageProps<"/[lang]/q/[token]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: getDict(lang).quoteLink.metaTitle, robots: { index: false, follow: false }, referrer: "no-referrer", alternates: {} };
}

async function Resolve({ params }: Pick<PageProps<"/[lang]/q/[token]">, "params">) {
  const { lang, token } = await params;
  if (!hasLocale(lang)) notFound();
  const shared = await findSharedQuote(token);
  if (!shared) notFound();
  const { doc } = shared;
  return (
    <QuoteLink
      t={getDict(lang)}
      lang={lang}
      token={token}
      state={shared.state}
      decision={shared.decision}
      expiresAt={shared.expiresAt?.toISOString() ?? null}
      portalHref={shared.portalHref}
      doc={{ ...doc, createdAt: doc.createdAt.toISOString() }}
    />
  );
}

export default function Page({ params }: PageProps<"/[lang]/q/[token]">) {
  return <Suspense fallback={null}><Resolve params={params} /></Suspense>;
}

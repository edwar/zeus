import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { getSession } from "@/lib/session";
import { FieldApp } from "@/components/FieldApp";
import { FieldBoot } from "@/components/FieldBoot";

// La app instalada en el teléfono abre aquí (ver /field.webmanifest) y trabaja sin señal.
export async function generateMetadata({ params }: PageProps<"/[lang]/app/field">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: { absolute: `Zeus ${getDict(lang).app.fieldMode.title}` }, manifest: `/field.webmanifest?lang=${lang}`, robots: { index: false, follow: false } };
}

async function Resolve({ params }: Pick<PageProps<"/[lang]/app/field">, "params">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const session = await getSession();
  if (!session) return null; // el layout de /app ya redirige al acceso
  return (
    <>
      <FieldBoot />
      <FieldApp t={getDict(lang)} lang={lang} userId={session.user.id} userName={session.user.name} />
    </>
  );
}

export default function Page({ params }: PageProps<"/[lang]/app/field">) {
  return <Suspense fallback={null}><Resolve params={params} /></Suspense>;
}

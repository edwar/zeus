import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({ params }: PageProps<"/[lang]/reset-password">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDict(lang);
  return (
    <section className="auth__card" aria-labelledby="reset-title">
      <h1 id="reset-title" className="auth__title">{t.auth.resetTitle}</h1>
      <p className="auth__sub">{t.auth.resetSub}</p>
      <Suspense fallback={null}>
        <ResetPasswordForm lang={lang} t={t} />
      </Suspense>
    </section>
  );
}

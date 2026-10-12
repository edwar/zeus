import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { mailConfigured } from "@/lib/mail";

export default async function ForgotPasswordPage({ params }: PageProps<"/[lang]/forgot-password">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDict(lang);
  return (
    <section className="auth__card" aria-labelledby="forgot-title">
      <h1 id="forgot-title" className="auth__title">{t.auth.forgotTitle}</h1>
      {mailConfigured() ? (
        <>
          <p className="auth__sub">{t.auth.forgotSub}</p>
          <ForgotPasswordForm lang={lang} t={t} />
        </>
      ) : (
        <p className="auth__sub">{t.auth.forgotOff}</p>
      )}
      <Link href={`/${lang}/login`} className="auth__back">{t.auth.goLogin}</Link>
    </section>
  );
}

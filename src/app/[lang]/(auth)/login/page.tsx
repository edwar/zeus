import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({ params }: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDict(lang);
  return (
    <section className="auth__card" aria-labelledby="login-title">
      <h1 id="login-title" className="auth__title">{t.auth.title}</h1>
      <p className="auth__sub">{t.auth.sub}</p>
      <LoginForm lang={lang} t={t} />
      <Link href={`/${lang}`} className="auth__back">{t.auth.back}</Link>
    </section>
  );
}

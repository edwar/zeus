"use client";

import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { authClient } from "@/lib/auth-client";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { Logo } from "@/components/SiteHeader";

/** Pantalla única mientras la cuenta tenga contraseña temporal: no se ve nada de la plataforma hasta cambiarla. */
export function ForcedPasswordChange({ lang, t }: { lang: Locale; t: Dict }) {
  const signOut = async () => {
    await authClient.signOut();
    window.location.replace(`/${lang}`);
  };
  return (
    <div className="auth">
      <header className="auth__top">
        <span className="brand"><Logo /><span>{t.brand}</span></span>
      </header>
      <main className="auth__main">
        <section className="auth__card" aria-labelledby="forced-title">
          <h1 id="forced-title" className="auth__title">{t.auth.forcedTitle}</h1>
          <p className="auth__sub">{t.auth.forcedSub}</p>
          <ChangePasswordForm t={t} forced />
          <button type="button" className="auth__back" onClick={signOut}>{t.auth.signOut}</button>
        </section>
      </main>
    </div>
  );
}

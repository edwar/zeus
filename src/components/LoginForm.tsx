"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

export function LoginForm({ lang, t }: { lang: Locale; t: Dict }) {
  const a = t.auth;
  const uid = useId().replace(/:/g, "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const { error } = await authClient.signIn.email({
      email: String(f.get("email")).trim(),
      password: String(f.get("password")),
    });
    if (error) {
      setBusy(false);
      setError(error.code === "BANNED_USER" ? a.banned : error.status === 401 ? a.invalid : error.status === 429 ? a.tooMany : a.generic);
      return;
    }
    // Navegación completa, no `router.replace`: si antes se intentó entrar a /app sin sesión, el router de Next
    // recuerda esa redirección al login y devolvería a esta misma página con el botón en "Ingresando…".
    window.location.replace(`/${lang}/app`);
  }

  return (
    <form onSubmit={onSubmit} className="auth__form" noValidate={false}>
      <div className="field">
        <label htmlFor={`${uid}e`}>{a.email}</label>
        <Input id={`${uid}e`} name="email" type="email" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor={`${uid}p`}>{a.password}</label>
        <PasswordInput id={`${uid}p`} name="password" autoComplete="current-password" required showLabel={a.showPassword} hideLabel={a.hidePassword} />
      </div>
      <Link href={`/${lang}/forgot-password`} className="auth__forgot">{a.forgot}</Link>
      <p className="field-error" role="alert" hidden={!error}>{error}</p>
      <Button type="submit" disabled={busy}>{busy ? a.submitting : a.submit}</Button>
    </form>
  );
}

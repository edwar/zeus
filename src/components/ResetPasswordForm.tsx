"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

/** Destino del enlace del correo: llega con ?token=… (o ?error=INVALID_TOKEN si venció). */
export function ResetPasswordForm({ lang, t }: { lang: Locale; t: Dict }) {
  const a = t.auth;
  const uid = useId().replace(/:/g, "");
  const params = useSearchParams();
  const token = params.get("token");
  const [error, setError] = useState(params.get("error") || !token ? a.resetInvalid : "");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const next = String(f.get("next"));
    if (next.length < 10) return setError(a.tooShort);
    if (next !== String(f.get("confirm"))) return setError(a.mismatch);
    setBusy(true);
    setError("");
    const { error } = await authClient.resetPassword({ newPassword: next, token: token! });
    setBusy(false);
    if (error) return setError(error.code === "INVALID_TOKEN" ? a.resetInvalid : error.status === 429 ? a.tooMany : a.generic);
    setDone(true);
  }

  if (done) {
    return (
      <>
        <p role="status">{a.resetDone}</p>
        <Link href={`/${lang}/login`} className="auth__back">{a.goLogin}</Link>
      </>
    );
  }
  if (!token) {
    return (
      <>
        <p className="field-error" role="alert">{a.resetInvalid}</p>
        <Link href={`/${lang}/forgot-password`} className="auth__back">{a.requestNew}</Link>
      </>
    );
  }
  return (
    <form onSubmit={onSubmit} className="auth__form">
      <div className="field">
        <label htmlFor={`${uid}n`}>{a.newPassword}</label>
        <PasswordInput id={`${uid}n`} name="next" autoComplete="new-password" minLength={10} maxLength={128} required showLabel={a.showPassword} hideLabel={a.hidePassword} />
      </div>
      <div className="field">
        <label htmlFor={`${uid}r`}>{a.confirmPassword}</label>
        <PasswordInput id={`${uid}r`} name="confirm" autoComplete="new-password" minLength={10} maxLength={128} required showLabel={a.showPassword} hideLabel={a.hidePassword} />
      </div>
      <p className="field-error" role="alert" hidden={!error}>{error}</p>
      {error === a.resetInvalid && <Link href={`/${lang}/forgot-password`} className="auth__back">{a.requestNew}</Link>}
      <Button type="submit" disabled={busy}>{busy ? a.resetSaving : a.resetSubmit}</Button>
    </form>
  );
}

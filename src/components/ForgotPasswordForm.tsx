"use client";

import { useId, useState } from "react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm({ lang, t }: { lang: Locale; t: Dict }) {
  const a = t.auth;
  const uid = useId().replace(/:/g, "");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await authClient.requestPasswordReset({ email: String(new FormData(e.currentTarget).get("email")).trim(), redirectTo: `/${lang}/reset-password` });
    setBusy(false);
    // La respuesta es la misma exista o no la cuenta: nunca se revela si el correo está registrado.
    if (error) return setError(error.status === 429 ? a.tooMany : a.forgotError);
    setSent(true);
  }

  if (sent) return <p role="status">{a.forgotSent}</p>;
  return (
    <form onSubmit={onSubmit} className="auth__form">
      <div className="field">
        <label htmlFor={`${uid}e`}>{a.email}</label>
        <Input id={`${uid}e`} name="email" type="email" autoComplete="username" required />
      </div>
      <p className="field-error" role="alert" hidden={!error}>{error}</p>
      <Button type="submit" disabled={busy}>{busy ? a.forgotSending : a.forgotSend}</Button>
    </form>
  );
}

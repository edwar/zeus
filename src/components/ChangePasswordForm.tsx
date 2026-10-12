"use client";

import { useId, useState } from "react";
import type { Dict } from "@/i18n";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

/** Cambio de la propia contraseña (pide la actual). Con `forced` es la pantalla obligatoria de la contraseña temporal. */
export function ChangePasswordForm({ t, forced = false, onDone }: { t: Dict; forced?: boolean; onDone?: () => void }) {
  const a = t.auth;
  const uid = useId().replace(/:/g, "");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const next = String(f.get("next"));
    if (next.length < 10) return setError(a.tooShort);
    if (next !== String(f.get("confirm"))) return setError(a.mismatch);
    setBusy(true);
    setError("");
    const { error } = await authClient.changePassword({ currentPassword: String(f.get("current")), newPassword: next, revokeOtherSessions: true });
    setBusy(false);
    if (error) return setError(error.code === "INVALID_PASSWORD" ? a.wrongCurrent : error.status === 429 ? a.tooMany : error.code === "PASSWORD_TOO_SHORT" ? a.tooShort : a.generic);
    form.reset();
    // Navegación completa: así el servidor vuelve a leer la sesión ya sin la marca de contraseña temporal.
    if (forced) return window.location.reload();
    setDone(true);
    onDone?.();
  }

  return (
    <form onSubmit={onSubmit} className="auth__form">
      <div className="field">
        <label htmlFor={`${uid}c`}>{a.currentPassword}</label>
        <PasswordInput id={`${uid}c`} name="current" autoComplete="current-password" required showLabel={a.showPassword} hideLabel={a.hidePassword} />
      </div>
      <div className="field">
        <label htmlFor={`${uid}n`}>{a.newPassword}</label>
        <PasswordInput id={`${uid}n`} name="next" autoComplete="new-password" minLength={10} maxLength={128} required showLabel={a.showPassword} hideLabel={a.hidePassword} />
      </div>
      <div className="field">
        <label htmlFor={`${uid}r`}>{a.confirmPassword}</label>
        <PasswordInput id={`${uid}r`} name="confirm" autoComplete="new-password" minLength={10} maxLength={128} required showLabel={a.showPassword} hideLabel={a.hidePassword} />
      </div>
      <p className="field-error" role="alert" hidden={!error}>{error}</p>
      <p role="status" hidden={!done}>{done ? a.changeDone : ""}</p>
      <Button type="submit" disabled={busy}>{busy ? a.resetSaving : a.changeSubmit}</Button>
    </form>
  );
}

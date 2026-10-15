"use client";

import { useState } from "react";
import type { Dict } from "@/i18n";
import { Button } from "@/components/ui/button";

/** Un solo botón: la baja la confirma quien abre el enlace, nunca se hace por el solo hecho de abrirlo. */
export function UnsubscribeForm({ t, token, maskedEmail }: { t: Dict; token: string; maskedEmail: string }) {
  const u = t.unsubscribe;
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function confirm() {
    setState("busy");
    const res = await fetch(`/api/unsubscribe/${token}`, { method: "POST" }).catch(() => null);
    setState(res?.ok ? "done" : "error");
  }

  if (state === "done") return <p role="status">{u.done}</p>;
  return (
    <div className="auth__form">
      <p>{u.intro} <strong>{maskedEmail}</strong>.</p>
      <p className="auth__sub">{u.note}</p>
      <p className="field-error" role="alert" hidden={state !== "error"}>{u.error}</p>
      <Button type="button" onClick={confirm} disabled={state === "busy"}>{state === "busy" ? u.working : u.confirm}</Button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fill } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ConfirmProvider";

type Target = { kind: "quote" | "lead"; id: string; name: string; hasEmail: boolean };

/**
 * Derechos de la persona sobre sus datos: dejar de escribirle y eliminar lo que se guardó de ella. Los dos piden
 * confirmación; eliminar vuelve a la lista porque el registro ya no existe con sus datos.
 */
export function PrivacyPanel({ t, lang, target }: { t: Dict; lang: Locale; target: Target }) {
  const p = t.app.privacy;
  const confirm = useConfirm();
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const body = JSON.stringify(target.kind === "quote" ? { quoteId: target.id } : { leadId: target.id });

  async function call(path: string) {
    setBusy(true);
    setMessage(null);
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body }).catch(() => null);
    setBusy(false);
    return res?.ok ? res : null;
  }

  async function stop() {
    if (!target.hasEmail) return setMessage({ ok: false, text: p.noEmail });
    if (!(await confirm({ message: p.stopConfirm, subject: target.name, confirmLabel: p.stopLabel, tone: "default" }))) return;
    setMessage((await call("/api/privacy/suppress")) ? { ok: true, text: p.stopDone } : { ok: false, text: p.failed });
  }

  async function erase() {
    if (!(await confirm({ message: p.eraseConfirm, subject: target.name, description: `${p.eraseConfirm.split("?")[1]?.trim()} ${p.eraseKeep}`, confirmLabel: p.eraseLabel }))) return;
    const res = await call("/api/privacy/erase");
    if (!res) return setMessage({ ok: false, text: p.failed });
    const r = (await res.json()) as { quotes: number; leads: number; simulations: number; projectsKept: number };
    await qc.invalidateQueries();
    // El contacto se borra por completo: no queda pantalla a la que quedarse. La solicitud sigue, ya anonimizada.
    if (target.kind === "lead") return router.push(`/${lang}/app/leads`);
    setMessage({ ok: true, text: `${p.erased} ${fill(p.summary, { quotes: r.quotes, leads: r.leads, simulations: r.simulations, projects: r.projectsKept })}` });
  }

  return (
    <section className="panel" aria-labelledby={`priv-${target.id}`}>
      <h2 id={`priv-${target.id}`} className="panel__title">{p.title}</h2>
      <p className="wiz__hint">{p.hint}</p>
      <div className="flow__actions">
        <Button type="button" variant="outline" disabled={busy} onClick={stop}>{p.stop}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={erase}>{p.erase}</Button>
      </div>
      {message && <p role={message.ok ? "status" : "alert"} className={message.ok ? "wiz__hint" : "field-error"}>{message.text}</p>}
    </section>
  );
}

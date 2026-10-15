"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Copy, Link2, Mail } from "lucide-react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fill } from "@/lib/format";
import type { SimulationState } from "@/lib/simulation";
import { readSource } from "@/components/SourceCapture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Saved = { url: string; emailed: "sent" | "failed" | "skipped" | "suppressed" | null };

/**
 * «Guarda tu cálculo»: retomar con un enlace (anónimo) o recibirlo por correo (con autorización, y un asesor puede escribir).
 * Es el momento de más interés del visitante: por eso se ofrece justo antes de pedir la cotización, sin exigirle nada.
 */
export function SaveCalculation({ t, lang, state, total, paybackYears }: { t: Dict; lang: Locale; state: SimulationState; total: number; paybackYears: number | null }) {
  const s = t.wiz.save;
  const uid = useId().replace(/:/g, "");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: async (contact?: { email: string }) => {
      const res = await fetch("/api/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, source: readSource(), state, total, paybackYears, ...(contact && { contact: { email: contact.email, consent: true } }) }),
      });
      if (!res.ok) throw Object.assign(new Error(String(res.status)), { status: res.status });
      return (await res.json()) as Saved;
    },
    onSuccess: (r, contact) => { setSaved(r); setCopied(false); setSentTo(contact?.email ?? ""); setError(""); },
    onError: (e) => setError((e as { status?: number }).status === 429 ? s.errorRate : s.errorGeneric),
  });

  async function copy() {
    if (!saved) return;
    await navigator.clipboard.writeText(saved.url).catch(() => {});
    setCopied(true);
  }

  return (
    <section className="wiz__save" aria-labelledby={`${uid}h`}>
      <h3 id={`${uid}h`}>{s.title}</h3>
      <p className="wiz__hint">{s.sub}</p>

      {saved ? (
        <div className="wiz__saved" role="status">
          <label htmlFor={`${uid}u`}>{s.linkReady}</label>
          <div className="wiz__copy">
            <Input id={`${uid}u`} readOnly value={saved.url} onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" onClick={copy}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? s.copied : s.copy}</Button>
          </div>
          {sentTo && <p>{saved.emailed === "sent" ? fill(s.sent, { email: sentTo }) : s.notSent}</p>}
        </div>
      ) : (
        <Button type="button" variant="outline" disabled={save.isPending} onClick={() => save.mutate(undefined)}><Link2 aria-hidden="true" />{save.isPending ? s.saving : s.link}</Button>
      )}

      <form
        className="wiz__savemail"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          save.mutate({ email: email.trim() });
        }}
      >
        <h4>{s.emailTitle}</h4>
        <div className="field">
          <label htmlFor={`${uid}e`}>{s.email}</label>
          <Input id={`${uid}e`} type="email" name="saveEmail" required maxLength={160} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <label className="wiz__consent"><input type="checkbox" name="saveConsent" required /> <span>{s.consent} <Link href={`/${lang}/privacy`} target="_blank" rel="noopener">{s.consentLink}</Link>.</span></label>
        <Button type="submit" disabled={save.isPending}><Mail aria-hidden="true" />{save.isPending ? s.saving : s.emailSend}</Button>
      </form>
      {error && <p className="field-error" role="alert">{error}</p>}
    </section>
  );
}

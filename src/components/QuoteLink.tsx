"use client";

import { useState } from "react";
import { CheckCircle2, Download, Hourglass, XCircle } from "lucide-react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fill, money } from "@/lib/format";
import type { QuoteDoc } from "@/lib/quote-doc";
import type { ClientDecision, ShareState } from "@/lib/quote-share";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  t: Dict;
  lang: Locale;
  token: string;
  state: ShareState;
  decision: ClientDecision | null;
  expiresAt: string | null;
  /** Portal del proyecto (solo cuando la cotización ya se aprobó y hay proyecto). */
  portalHref: string | null;
  doc: Omit<QuoteDoc, "createdAt"> & { createdAt: string };
};

/** Cotización que ve el cliente desde su enlace: resumen, PDF y respuesta (aceptar o no). Aceptar no aprueba nada por sí solo. */
export function QuoteLink({ t, lang, token, state, decision: initial, expiresAt, portalHref, doc }: Props) {
  const c = t.quoteLink;
  const date = new Intl.DateTimeFormat(lang, { dateStyle: "long" });
  const m = (n: number) => money(lang, n, doc.currency);
  const [decision, setDecision] = useState<ClientDecision | null>(initial);
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function answer(d: ClientDecision) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/q/${token}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: d, total: doc.total, note: d === "declined" && note.trim() ? note.trim() : undefined }),
      });
      if (res.ok) return setDecision(d);
      const code = ((await res.json().catch(() => null)) as { error?: string } | null)?.error;
      setError(code === "changed" ? c.errors.changed : code === "rate_limited" ? c.errors.limit : c.errors.generic);
    } catch {
      setError(c.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  const closed = state === "expired" || state === "closed";
  const answered = decision ?? (state === "decided" ? initial : null);

  return (
    <div className="wrap pdetail qlink">
      <header className="qlink__head">
        <p className="qlink__eyebrow">{c.eyebrow} · {doc.ref}</p>
        <h1 className="qlink__title">{fill(c.hello, { name: doc.name })}</h1>
        <p className="qlink__lead">{c.intro}</p>
      </header>

      <section className="panel" aria-labelledby="ql-summary">
        <h2 id="ql-summary" className="panel__title">{c.system}</h2>
        <dl className="pspecs">
          <div><dt>{c.system}</dt><dd>{c.systems[doc.systemType]}</dd></div>
          <div><dt>{c.kwp}</dt><dd>{doc.kwp} kWp</dd></div>
          <div><dt>{c.modality}</dt><dd>{c.modalities[doc.fulfillment]}</dd></div>
          <div><dt>{c.date}</dt><dd>{date.format(new Date(doc.createdAt))}</dd></div>
          {expiresAt && !closed && <div><dt>{c.validUntil}</dt><dd>{date.format(new Date(expiresAt))}</dd></div>}
        </dl>
      </section>

      <section className="panel" aria-labelledby="ql-kit">
        <h2 id="ql-kit" className="panel__title">{c.kit}</h2>
        <ul className="qlink__items">
          {doc.items.map((i, k) => (
            <li key={k}>
              <span className="qlink__name">{i.name}</span>
              <span className="qlink__calc">{i.qty} × {m(i.unitPrice)}</span>
              <strong className="qlink__sub">{m(i.unitPrice * i.qty)}</strong>
            </li>
          ))}
        </ul>
        <p className="qlink__total"><span>{c.total}</span><strong>{m(doc.total)}</strong></p>
        {doc.financing && (
          <>
            <h3 className="flow__h">{c.financing.title}</h3>
            <dl className="pspecs">
              <div><dt>{c.financing.monthly}</dt><dd>{m(doc.financing.monthly)}</dd></div>
              <div><dt>{c.financing.down}</dt><dd>{doc.financing.downPct} % · {m(doc.financing.down)}</dd></div>
              <div><dt>{c.financing.term}</dt><dd>{doc.financing.termMonths} {c.financing.months}</dd></div>
            </dl>
            <p className="wiz__hint">{c.financing.note}</p>
          </>
        )}
        <p className="wiz__hint">{c.note}</p>
        {!closed && (
          <Button asChild variant="outline" className="qlink__pdf">
            <a href={`/api/q/${token}/pdf?lang=${lang}`}><Download aria-hidden="true" />{c.download}</a>
          </Button>
        )}
      </section>

      <section className="panel qlink__answer" aria-live="polite">
        {closed ? (
          <>
            <Result icon={<Hourglass aria-hidden="true" />} title={c[state === "expired" ? "expired" : "closed"].title} text={c[state === "expired" ? "expired" : "closed"].text} />
            {portalHref && <a className={buttonVariants({ variant: "default" }) + " qlink__pdf"} href={portalHref}>{c.viewProject}</a>}
          </>
        ) : answered === "accepted" ? (
          <Result icon={<CheckCircle2 aria-hidden="true" />} title={c.accepted.title} text={c.accepted.text} tone="ok" />
        ) : answered === "declined" ? (
          <Result icon={<XCircle aria-hidden="true" />} title={c.declined.title} text={c.declined.text} />
        ) : (
          <>
            <p className="wiz__hint">{c.acceptHint}</p>
            {declining && (
              <div className="field">
                <label htmlFor="ql-note">{c.reasonLabel}</label>
                <Textarea id="ql-note" value={note} maxLength={500} rows={3} onChange={(e) => setNote(e.target.value)} />
              </div>
            )}
            <div className="flow__actions">
              {!declining && <Button type="button" disabled={busy} onClick={() => answer("accepted")}>{busy ? c.sending : c.accept}</Button>}
              {declining
                ? <Button type="button" variant="outline" disabled={busy} onClick={() => answer("declined")}>{busy ? c.sending : c.decline}</Button>
                : <Button type="button" variant="outline" disabled={busy} onClick={() => setDeclining(true)}>{c.decline}</Button>}
            </div>
            {error && <p className="field-error" role="alert">{error}</p>}
          </>
        )}
      </section>
    </div>
  );
}

function Result({ icon, title, text, tone }: { icon: React.ReactNode; title: string; text: string; tone?: "ok" }) {
  return (
    <div className={`qlink__result${tone === "ok" ? " qlink__result--ok" : ""}`} role="status">
      {icon}
      <div><strong>{title}</strong><p>{text}</p></div>
    </div>
  );
}

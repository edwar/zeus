"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { BillData } from "@/lib/ai/bill";
import { emptyValues, sizingOf, valuesFromBill, type ReviewValues, type Sources } from "@/lib/wizard";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { BillUpload } from "./BillUpload";
import { BillReview } from "./BillReview";
import { ApplianceEstimator } from "./ApplianceEstimator";
import type { ApplianceRow } from "@/lib/appliances";
import { KitBuilder, type KitInitial } from "./KitBuilder";
import { Loading } from "@/components/Loading";
import { TOKEN_RE } from "@/lib/quote-share";

type Step = "upload" | "appliances" | "review" | "kit" | "sent";
const ORDER = ["upload", "review", "kit"] as const;
// El cálculo por electrodomésticos reemplaza al paso de la factura: ocupa su lugar en la barra de pasos.
const slot = (s: Step): Step => (s === "appliances" ? "upload" : s);

export function BillWizard({ t, lang }: { t: Dict; lang: Locale }) {
  const w = t.wiz;
  const [step, setStep] = useState<Step>("upload");
  const [values, setValues] = useState<ReviewValues>(emptyValues);
  const [sources, setSources] = useState<Sources>({});
  const [byAppliances, setByAppliances] = useState(false); // de dónde viene el consumo: define a qué paso vuelve «Atrás»
  const [rows, setRows] = useState<ApplianceRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sent, setSent] = useState<{ id: string; total: number; fulfillment: string } | null>(null);
  // Cálculo guardado: si la URL trae ?s=<token> se recupera y se salta directo al kit.
  const [restore, setRestore] = useState<"idle" | "loading" | "error">("idle");
  const [restored, setRestored] = useState<{ savedAt: string; initial: KitInitial } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // Al cambiar de paso el foco pasa al título: quien usa lector de pantalla o teclado no queda "atrás".
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    heading.current?.focus();
  }, [step]);

  const sizing = useMemo(() => sizingOf(values), [values]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("s");
    if (!token || !TOKEN_RE.test(token)) return;
    let cancelled = false;
    setRestore("loading");
    fetch(`/api/simulations/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as { state: { values: ReviewValues; kit: KitInitial; fin: KitInitial["fin"] }; savedAt: string };
      })
      .then((r) => {
        if (cancelled) return;
        setValues(r.state.values);
        setRestored({ savedAt: r.savedAt, initial: { ...r.state.kit, fin: r.state.fin } });
        setRestore("idle");
        setStep("kit");
      })
      .catch(() => !cancelled && setRestore("error"));
    return () => { cancelled = true; };
  }, []);

  function onExtracted(bill: BillData) {
    const r = valuesFromBill(bill);
    setValues(r.values);
    setSources(r.sources);
    setByAppliances(false);
    setWarnings(bill.warnings);
    setStep("review");
  }

  function onAppliances(kwh: number) {
    setValues({ ...emptyValues(), monthlyKwh: String(Math.round(kwh * 10) / 10) });
    setSources({ monthlyKwh: "estimated" });
    setByAppliances(true);
    setWarnings([]);
    setStep("review");
  }

  function restart() {
    setRows([]);
    setByAppliances(false);
    setValues(emptyValues());
    setSources({});
    setWarnings([]);
    setSent(null);
    setRestored(null);
    setStep("upload");
  }

  const titles: Record<Step, string> = { upload: w.upload.label, appliances: w.appliances.title, review: w.review.title, kit: w.kit.title, sent: w.send.doneTitle };

  return (
    <section className="wrap wiz" aria-labelledby="wiz-title">
      <header className="wiz__head">
        <h2 id="wiz-title">{w.title}</h2>
        <p>{w.sub}</p>
      </header>

      {step !== "sent" && (
        <ol className="wiz__steps" aria-label={w.title}>
          {ORDER.map((s, i) => (
            <li key={s} aria-current={s === slot(step) ? "step" : undefined} className={(ORDER as readonly Step[]).indexOf(slot(step)) > i ? "is-done" : s === slot(step) ? "is-cur" : ""}>
              <span>{i + 1}</span> {w.steps[s]}
            </li>
          ))}
        </ol>
      )}

      <div className="wiz__panel">
        <h3 ref={heading} tabIndex={-1} className="wiz__title">{titles[step]}</h3>
        {restore === "loading" && <Loading label={w.save.restoring} rows={4} />}
        {restore === "error" && <p className="wiz__hint" role="alert">{w.save.restoreError}</p>}
        {step === "upload" && restore !== "loading" && <BillUpload t={t} lang={lang} onExtracted={onExtracted} onManual={() => setStep("review")} onAppliances={() => setStep("appliances")} />}
        {step === "appliances" && <ApplianceEstimator t={t} rows={rows} onChange={setRows} onBack={() => setStep("upload")} onUse={onAppliances} />}
        {step === "review" && (
          <BillReview
            t={t}
            values={values}
            sources={sources}
            warnings={warnings}
            onChange={setValues}
            onBack={() => setStep(byAppliances ? "appliances" : "upload")}
            onNext={() => setStep("kit")}
          />
        )}
        {step === "kit" && sizing && (
          <KitBuilder t={t} lang={lang} values={values} sizing={sizing} initial={restored?.initial} restoredAt={restored?.savedAt} onCoverage={(pct) => setValues((v) => ({ ...v, coveragePct: String(pct) }))} onBack={() => setStep("review")} onSent={(id, total, fulfillment) => { setSent({ id, total, fulfillment }); setStep("sent"); }} />
        )}
        {step === "sent" && sent && (
          <div className="wiz__done" role="status">
            <p>{w.send.doneText} <strong>{sent.id.slice(-8).toUpperCase()}</strong></p>
            {sent.fulfillment === "kit_only" && <p className="wiz__sub">{w.service.doneKitOnly}</p>}
            <p className="wiz__sub">{w.kit.total}: <strong>{money(lang, sent.total, "COP")}</strong></p>
            <Button type="button" variant="outline" onClick={restart}>{w.send.again}</Button>
          </div>
        )}
      </div>
    </section>
  );
}

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
import { KitBuilder } from "./KitBuilder";

type Step = "upload" | "review" | "kit" | "sent";
const ORDER = ["upload", "review", "kit"] as const;

export function BillWizard({ t, lang }: { t: Dict; lang: Locale }) {
  const w = t.wiz;
  const [step, setStep] = useState<Step>("upload");
  const [values, setValues] = useState<ReviewValues>(emptyValues);
  const [sources, setSources] = useState<Sources>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sent, setSent] = useState<{ id: string; total: number; fulfillment: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // Al cambiar de paso el foco pasa al título: quien usa lector de pantalla o teclado no queda "atrás".
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    heading.current?.focus();
  }, [step]);

  const sizing = useMemo(() => sizingOf(values), [values]);

  function onExtracted(bill: BillData) {
    const r = valuesFromBill(bill);
    setValues(r.values);
    setSources(r.sources);
    setWarnings(bill.warnings);
    setStep("review");
  }

  function restart() {
    setValues(emptyValues());
    setSources({});
    setWarnings([]);
    setSent(null);
    setStep("upload");
  }

  const titles: Record<Step, string> = { upload: w.upload.label, review: w.review.title, kit: w.kit.title, sent: w.send.doneTitle };

  return (
    <section className="wrap wiz" aria-labelledby="wiz-title">
      <header className="wiz__head">
        <h2 id="wiz-title">{w.title}</h2>
        <p>{w.sub}</p>
      </header>

      {step !== "sent" && (
        <ol className="wiz__steps" aria-label={w.title}>
          {ORDER.map((s, i) => (
            <li key={s} aria-current={s === step ? "step" : undefined} className={(ORDER as readonly Step[]).indexOf(step) > i ? "is-done" : s === step ? "is-cur" : ""}>
              <span>{i + 1}</span> {w.steps[s]}
            </li>
          ))}
        </ol>
      )}

      <div className="wiz__panel">
        <h3 ref={heading} tabIndex={-1} className="wiz__title">{titles[step]}</h3>
        {step === "upload" && <BillUpload t={t} onExtracted={onExtracted} onManual={() => setStep("review")} />}
        {step === "review" && (
          <BillReview
            t={t}
            values={values}
            sources={sources}
            warnings={warnings}
            onChange={setValues}
            onBack={() => setStep("upload")}
            onNext={() => setStep("kit")}
          />
        )}
        {step === "kit" && sizing && (
          <KitBuilder t={t} lang={lang} values={values} sizing={sizing} onBack={() => setStep("review")} onSent={(id, total, fulfillment) => { setSent({ id, total, fulfillment }); setStep("sent"); }} />
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

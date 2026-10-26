"use client";

import { useId, useState } from "react";
import type { Dict } from "@/i18n";
import { type FieldSource, type ReviewErrors, type ReviewValues, type Sources, sunFor, validate } from "@/lib/wizard";
import { ServiceAreaNotice } from "./ServiceAreaNotice";
import { LocationPicker, type PickedLocation } from "./LocationPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  t: Dict;
  values: ReviewValues;
  sources: Sources;
  warnings: string[];
  onChange: (v: ReviewValues) => void;
  onBack: () => void;
  onNext: () => void;
};

const COVERAGES = ["50", "70", "85", "100"];
const NONE = "none"; // Radix no admite value="" en un ítem

// "0250" → "250" (conserva "0," y "0.5").
const noLeadingZeros = (s: string) => s.replace(/^0+(?=\d)/, "");

export function BillReview({ t, values: v, sources, warnings, onChange, onBack, onNext }: Props) {
  const r = t.wiz.review;
  const uid = useId().replace(/:/g, "");
  const [errors, setErrors] = useState<ReviewErrors>({});
  const set = <K extends keyof ReviewValues>(k: K, val: ReviewValues[K]) => onChange({ ...v, [k]: typeof val === "string" ? (noLeadingZeros(val) as ReviewValues[K]) : val });

  // Al cambiar el tipo se dejan valores razonables: el aislado debe cubrir todo y la carga se estima del consumo (≈ 4 veces el promedio).
  // Al elegir el lugar se traen las horas sol pico de ese punto; si no hay dato se conserva lo que había.
  function onPick(p: PickedLocation) {
    const annual = p.sun ? String(p.sun.annual) : "";
    const min = p.sun ? String(p.sun.min) : "";
    onChange({
      ...v,
      lat: String(p.lat),
      lon: String(p.lon),
      municipality: p.municipality ?? "",
      department: p.department ?? "",
      sunAnnual: annual,
      sunMin: min,
      peakSunHours: sunFor(v.systemType, annual, min) ?? v.peakSunHours,
    });
  }

  function pickType(k: ReviewValues["systemType"]) {
    const kwh = Number(v.monthlyKwh.replace(",", "."));
    const est = kwh > 0 ? String(Math.min(100, Math.max(0.5, Math.round(((kwh / 720) * 4) * 2) / 2))) : "";
    onChange({
      ...v,
      systemType: k,
      peakSunHours: sunFor(k, v.sunAnnual, v.sunMin) ?? v.peakSunHours,
      // Red y aislado cubren todo el consumo (campo bloqueado); el híbrido deja elegir y arranca en 85 %.
      coveragePct: k === "hybrid" ? (v.systemType === "hybrid" ? v.coveragePct : "85") : "100",
      autonomyHours: k === "ongrid" ? v.autonomyHours : v.autonomyHours || (k === "offgrid" ? "24" : "4"),
      backupKw: k === "ongrid" ? v.backupKw : v.backupKw || est,
    });
  }

  const badge = (s?: FieldSource) =>
    !s ? null : s === "bill" ? <Badge>{r.fromBill}</Badge> : s === "missing" ? <Badge variant="warning">{r.missing}</Badge> : s === "derived" ? <Badge variant="secondary">{r.derived}</Badge> : s === "estimated" ? <Badge variant="secondary">{r.estimated}</Badge> : <Badge variant="warning">{r.check}</Badge>;

  const err = (k: keyof ReviewErrors) => (errors[k] ? { "aria-invalid": true as const, "aria-describedby": `${uid}${k}e` } : {});
  const Err = ({ k }: { k: keyof ReviewErrors }) => (errors[k] ? <span id={`${uid}${k}e`} className="field-error">{r.invalid}</span> : null);

  function next(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(v);
    setErrors(found);
    if (Object.keys(found).length === 0) return onNext();
    const first = Object.keys(found)[0];
    (document.getElementById(`${uid}${first}`) as HTMLElement | null)?.focus();
  }

  return (
    <form className="wiz__form" onSubmit={next} noValidate>
      {warnings.length > 0 && (
        <div className="wiz__warn" role="status">
          <strong>{r.warnings}</strong>
          <ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      )}

      <fieldset className="wiz__group">
        <legend>{r.billSection}</legend>
        <div className="field">
          <label htmlFor={`${uid}monthlyKwh`}>{r.monthlyKwh} {badge(sources.monthlyKwh)}</label>
          <Input id={`${uid}monthlyKwh`} type="number" inputMode="decimal" min={0} step="any" value={v.monthlyKwh} onChange={(e) => set("monthlyKwh", e.target.value)} {...err("monthlyKwh")} />
          <span className="wiz__hint">{r.monthlyHint}</span>
          <Err k="monthlyKwh" />
        </div>
        <div className="field">
          <label htmlFor={`${uid}tariff`}>{r.tariff} {badge(sources.tariff)}</label>
          <Input id={`${uid}tariff`} type="number" inputMode="decimal" min={0} step="any" value={v.tariff} onChange={(e) => set("tariff", e.target.value)} {...err("tariff")} />
          <span className="wiz__hint">{r.tariffHint}</span>
          <Err k="tariff" />
        </div>
        <div className="field">
          <label htmlFor={`${uid}connection`}>{r.connection} {badge(sources.connection)}</label>
          <Select value={v.connection || "unknown"} onValueChange={(c) => set("connection", c === "unknown" ? "" : (c as ReviewValues["connection"]))}>
            <SelectTrigger id={`${uid}connection`}><SelectValue>{r.connections[v.connection || "unknown"]}</SelectValue></SelectTrigger>
            <SelectContent>
              {(["unknown", "single_phase", "two_phase", "three_phase"] as const).map((c) => <SelectItem key={c} value={c}>{r.connections[c]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="field">
          <label htmlFor={`${uid}estrato`}>{r.estrato}</label>
          <Select value={v.estrato || NONE} onValueChange={(c) => set("estrato", c === NONE ? "" : c)}>
            <SelectTrigger id={`${uid}estrato`}><SelectValue>{v.estrato || r.noEstrato}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{r.noEstrato}</SelectItem>
              {[1, 2, 3, 4, 5, 6].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="field">
          <label htmlFor={`${uid}operator`}>{r.operator}</label>
          <Input id={`${uid}operator`} value={v.operator} maxLength={80} onChange={(e) => set("operator", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${uid}peakSunHours`}>{r.sun}</label>
          <Input id={`${uid}peakSunHours`} type="number" inputMode="decimal" min={1} max={9} step="0.1" value={v.peakSunHours} onChange={(e) => set("peakSunHours", e.target.value)} {...err("peakSunHours")} />
          <span className="wiz__hint">{v.sunAnnual ? r.sunAuto : r.sunHint}</span>
          <Err k="peakSunHours" />
        </div>
        <div className="field field--wide">
          <span className="label">{r.location.title} {badge(sources.location)}</span>
          <LocationPicker
            t={t}
            lat={v.lat ? Number(v.lat) : null}
            lon={v.lon ? Number(v.lon) : null}
            hint={[v.municipality, v.department].filter(Boolean).join(", ")}
            place={[v.municipality, v.department].filter(Boolean).join(", ")}
            sun={v.sunAnnual ? { annual: Number(v.sunAnnual), min: Number(v.sunMin || v.sunAnnual) } : null}
            onPick={onPick}
          />
          <ServiceAreaNotice t={t} lat={v.lat} lon={v.lon} />
        </div>
      </fieldset>

      <fieldset className="wiz__group wiz__group--system">
        <legend>{r.systemSection}</legend>
        <div className="wiz__types" role="radiogroup" aria-label={r.systemType}>
          {(["ongrid", "hybrid", "offgrid"] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={v.systemType === k} className="wiz__type" onClick={() => pickType(k)}>
              <strong>{r[k]}</strong>
              <span>{r.typeDesc[k]}</span>
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor={`${uid}coveragePct`}>{r.coverage}</label>
          <Select value={COVERAGES.includes(v.coveragePct) ? v.coveragePct : "custom"} onValueChange={(c) => set("coveragePct", c)} disabled={v.systemType !== "hybrid"}>
            <SelectTrigger id={`${uid}coveragePct`}><SelectValue>{v.coveragePct}%</SelectValue></SelectTrigger>
            <SelectContent>
              {COVERAGES.map((c) => <SelectItem key={c} value={c}>{c}%</SelectItem>)}
              {!COVERAGES.includes(v.coveragePct) && <SelectItem value="custom" disabled>{v.coveragePct}%</SelectItem>}
            </SelectContent>
          </Select>
          <span className="wiz__hint">{v.systemType === "hybrid" ? r.coverageHint : v.systemType === "offgrid" ? r.coverageOffHint : r.coverageGridHint}</span>
        </div>

        {v.systemType !== "ongrid" && (
          <>
            <div className="field">
              <label htmlFor={`${uid}autonomyHours`}>{r.autonomy}</label>
              <Select value={v.autonomyHours} onValueChange={(c) => set("autonomyHours", c)}>
                <SelectTrigger id={`${uid}autonomyHours`}><SelectValue>{r.autonomyOptions[v.autonomyHours] ?? `${v.autonomyHours} h`}</SelectValue></SelectTrigger>
                <SelectContent>
                  {Object.entries(r.autonomyOptions).map(([h, label]) => <SelectItem key={h} value={h}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="wiz__hint">{v.systemType === "offgrid" ? r.autonomyOffHint : r.autonomyHint}</span>
            </div>
            <div className="field">
              <label htmlFor={`${uid}backupKw`}>{v.systemType === "offgrid" ? r.peakKw : r.backupKw}</label>
              <Input id={`${uid}backupKw`} type="number" inputMode="decimal" min={0} step="any" value={v.backupKw} onChange={(e) => set("backupKw", e.target.value)} {...err("backupKw")} />
              <span className="wiz__hint">{v.systemType === "offgrid" ? r.peakHint : r.backupHint}</span>
              <Err k="backupKw" />
            </div>
          </>
        )}
      </fieldset>

      <div className="wiz__actions">
        <Button type="button" variant="outline" onClick={onBack}>{r.back}</Button>
        <Button type="submit">{r.next}</Button>
      </div>
    </form>
  );
}

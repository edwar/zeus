"use client";

import { useId } from "react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { money } from "@/lib/format";
import { TERMS } from "@/lib/finance/rates-core";
import { paybackMonths, shortestCoveredTerm, simulateLoan } from "@/lib/finance/loan";
import { useFinanceRates } from "@/hooks/useFinanceRates";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type FinState = { on: boolean; downPct: number; termMonths: number; rate: string | null; entity: string | null };
export const initialFinancing: FinState = { on: false, downPct: 20, termMonths: 36, rate: null, entity: null };

const DOWN = [0, 10, 20, 30, 40, 50];
const FALLBACK_RATE = 24; // solo si la fuente pública no responde; el usuario puede escribir la suya

/** Tasa efectiva que se usa para simular: la elegida (o el promedio del mercado), sin pasar del tope de usura. */
export function effectiveRate(f: FinState, market: number | null, usury: number | null): number {
  const raw = f.rate != null && f.rate !== "" ? Number(f.rate.replace(",", ".")) : (market ?? FALLBACK_RATE);
  const r = Number.isFinite(raw) ? Math.max(0, raw) : FALLBACK_RATE;
  return usury != null ? Math.min(r, usury) : r;
}

type Props = { t: Dict; lang: Locale; total: number; monthlySavings: number | null; value: FinState; onChange: (v: FinState) => void };

/** Simula financiar el kit con tasas de referencia públicas y compara la cuota con el ahorro mensual de energía. */
export function FinancingPanel({ t, lang, total, monthlySavings, value: f, onChange }: Props) {
  const m = t.wiz.finance;
  const uid = useId().replace(/:/g, "");
  const rates = useFinanceRates(f.termMonths, f.on);
  const cop = (n: number) => money(lang, n, "COP");
  const pct = (n: number) => `${n.toLocaleString(lang, { maximumFractionDigits: 2 })} %`;
  const set = (patch: Partial<FinState>) => onChange({ ...f, ...patch });

  const usury = rates.data?.usury?.usuryEA ?? null;
  const market = rates.data?.market ?? null;
  const rate = effectiveRate(f, market, usury);
  const loan = simulateLoan({ price: total, downPct: f.downPct, termMonths: f.termMonths, rateEA: rate });
  const savings = monthlySavings != null && monthlySavings > 0 ? monthlySavings : null;
  const diff = savings != null ? savings - loan.monthly : null;
  const covered = shortestCoveredTerm({ price: total, downPct: f.downPct, rateEA: rate }, savings ?? 0, TERMS);
  const payback = savings != null ? paybackMonths(loan, savings) : null;
  const typed = f.rate != null && Number(f.rate.replace(",", ".")) > rate; // lo escrito pasa del tope de usura

  return (
    <section className="fin" aria-labelledby={`${uid}h`}>
      <div className="fin__head">
        <h3 id={`${uid}h`}>{m.title}</h3>
        <label className="fin__toggle">
          <input type="checkbox" checked={f.on} onChange={(e) => set({ on: e.target.checked })} /> {m.toggle}
        </label>
      </div>
      <p className="wiz__hint">{m.intro}</p>

      {f.on && (
        <>
          <div className="fin__controls">
            <div className="field">
              <label htmlFor={`${uid}d`}>{m.down}</label>
              <Select value={String(f.downPct)} onValueChange={(v) => set({ downPct: Number(v) })}>
                <SelectTrigger id={`${uid}d`}><SelectValue /></SelectTrigger>
                <SelectContent>{DOWN.map((d) => <SelectItem key={d} value={String(d)}>{d} % · {cop((total * d) / 100)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="field">
              <label htmlFor={`${uid}t`}>{m.term}</label>
              <Select value={String(f.termMonths)} onValueChange={(v) => set({ termMonths: Number(v), ...(f.entity ? { rate: null, entity: null } : {}) })}>
                <SelectTrigger id={`${uid}t`}><SelectValue /></SelectTrigger>
                <SelectContent>{TERMS.map((n) => <SelectItem key={n} value={String(n)}>{n} {m.months}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="field">
              <label htmlFor={`${uid}r`}>{m.rate}</label>
              <Input id={`${uid}r`} type="number" inputMode="decimal" min={0} max={usury ?? 100} step="0.01" value={f.rate ?? String(rate)} onChange={(e) => set({ rate: e.target.value, entity: null })} />
              <span className="wiz__hint">
                {typed && usury != null ? m.cappedHint.replace("{max}", pct(usury)) : usury != null ? m.usuryHint.replace("{max}", pct(usury)) : m.noUsury}
              </span>
            </div>
          </div>

          {rates.isPending ? (
            <p className="wiz__hint" role="status">{m.loadingRates}</p>
          ) : rates.isError || !rates.data ? (
            <p className="wiz__hint" role="status">{m.ratesError}</p>
          ) : (
            <div className="fin__banks">
              <p className="fin__banks-title">{m.refTitle.replace("{term}", rates.data.bucket.toLowerCase())}</p>
              <ul>
                {market != null && (
                  <li className="fin__market">
                    <button type="button" className={f.rate == null ? "is-on" : ""} onClick={() => set({ rate: null, entity: null })}>
                      <span className="fin__name">{m.market}</span><strong>{pct(market)}</strong>
                      <small>{m.marketHint}</small>
                    </button>
                  </li>
                )}
                {rates.data.banks.map((b) => (
                  <li key={b.name}>
                    <button type="button" className={f.entity === b.name ? "is-on" : ""} onClick={() => set({ rate: String(b.rateEA), entity: b.name })}>
                      <span className="fin__name">{b.name}</span><strong>{pct(b.rateEA)}</strong>
                      <small>{b.type} · {b.credits} {m.credits}</small>
                    </button>
                  </li>
                ))}
              </ul>
              {rates.data.banks.length === 0 && <p className="wiz__hint">{m.noBanks}</p>}
            </div>
          )}

          <dl className="fin__result" aria-live="polite">
            <div className="fin__big"><dt>{m.monthly}</dt><dd>{cop(loan.monthly)}</dd></div>
            <div><dt>{m.financed}</dt><dd>{cop(loan.financed)}</dd></div>
            <div><dt>{m.interest}</dt><dd>{cop(loan.interest)}</dd></div>
            <div><dt>{m.totalPaid}</dt><dd>{cop(loan.totalPaid)}</dd></div>
          </dl>

          {savings == null ? (
            <p className="wiz__hint">{m.noSavings}</p>
          ) : (
            <div className={`fin__verdict ${diff! >= 0 ? "fin__verdict--ok" : "fin__verdict--warn"}`} role="status">
              <strong>{diff! >= 0 ? m.covers.replace("{diff}", cop(diff!)) : m.short.replace("{diff}", cop(-diff!))}</strong>
              <span>{m.compare.replace("{savings}", cop(savings)).replace("{pay}", cop(loan.monthly))}</span>
              {diff! < 0 && (covered != null ? <span>{m.coveredFrom.replace("{n}", String(covered))}</span> : <span>{m.notCovered}</span>)}
              {payback != null && <span>{m.payback.replace("{n}", String(payback))}</span>}
            </div>
          )}

          <p className="wiz__privacy">
            {rates.data?.cutoff ? m.source.replace("{date}", rates.data.cutoff) : m.sourceNoDate}
            {rates.data?.usury && ` ${m.usuryNote.replace("{max}", pct(rates.data.usury.usuryEA)).replace("{res}", rates.data.usury.resolution)}`} {m.disclaimer}
          </p>
        </>
      )}
    </section>
  );
}

"use client";

import { useId, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { Tier } from "@/lib/kit";
import { fill, money } from "@/lib/format";
import { TERMS } from "@/lib/finance/rates-core";
import { coverageSteps, evaluate, highlights, type Scenario } from "@/lib/scenarios";
import { kitBaseOf, sizingOf, type ReviewValues } from "@/lib/wizard";
import { fetchKitOptions } from "@/hooks/useKitOptions";
import { useFinanceRates } from "@/hooks/useFinanceRates";
import { effectiveRate, type FinState } from "@/components/FinancingPanel";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/Loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DOWN = [0, 10, 20, 30, 40, 50];

type Props = {
  t: Dict;
  lang: Locale;
  values: ReviewValues;
  /** Opción de kit elegida: se compara con el mismo nivel (económico, equilibrado o premium); si armó el suyo, con el equilibrado. */
  tier: Tier | "custom";
  fin: FinState;
  onFin: (patch: Partial<FinState>) => void;
  onPick: (coveragePct: number) => void;
};

/**
 * «Compara escenarios»: el mismo recibo con distintos tamaños de sistema, al contado y financiado. Se abre a pedido
 * (no antes) para no pedir los kits de cada tamaño a quien no lo va a mirar.
 */
export function ScenarioComparator(props: Props) {
  const [open, setOpen] = useState(false);
  const c = props.t.wiz.compare;
  const uid = useId().replace(/:/g, "");
  return (
    <section className="cmp" aria-labelledby={`${uid}h`}>
      <div className="cmp__head">
        <h3 id={`${uid}h`}>{c.title}</h3>
        <Button type="button" variant="outline" aria-expanded={open} aria-controls={`${uid}b`} onClick={() => setOpen((v) => !v)}>{open ? c.close : c.open}</Button>
      </div>
      <p className="wiz__hint">{c.sub}</p>
      <div id={`${uid}b`}>{open && <Comparison {...props} />}</div>
    </section>
  );
}

function Comparison({ t, lang, values, tier, fin, onFin, onPick }: Props) {
  const c = t.wiz.compare;
  const k = t.wiz.kit;
  const uid = useId().replace(/:/g, "");
  const current = Number(values.coveragePct.replace(",", "."));
  const steps = coverageSteps(current);
  const cop = (n: number) => money(lang, n, "COP");
  const pct = (n: number) => `${n.toLocaleString(lang, { maximumFractionDigits: 1 })}`;
  const useTier: Tier = tier === "custom" ? "balanced" : tier;

  // Un tamaño por cobertura: la misma persona, el mismo recibo, otra parte del consumo.
  const sized = steps.map((coverage) => {
    const v = { ...values, coveragePct: String(coverage) };
    return { coverage, v, sizing: sizingOf(v) };
  });
  const options = useQueries({
    queries: sized.map((s) => ({
      // Misma clave que usa el kit elegido: el tamaño actual sale de la caché, sin pedirlo otra vez.
      queryKey: ["kit-options", s.sizing ? kitBaseOf(s.v, s.sizing) : null],
      queryFn: () => fetchKitOptions(kitBaseOf(s.v, s.sizing!)),
      enabled: s.sizing != null,
      staleTime: 30_000,
    })),
  });
  const rates = useFinanceRates(fin.termMonths, true);
  const rate = effectiveRate(fin, rates.data?.market ?? null, rates.data?.usury?.usuryEA ?? null);

  if (options.some((q) => q.isPending) || rates.isPending) return <Loading label={c.loading} rows={4} />;
  if (options.some((q) => q.isError)) return <p role="alert">{c.error} <Button type="button" variant="outline" size="sm" onClick={() => options.forEach((q) => q.refetch())}>{c.retry}</Button></p>;

  const all = sized.map((s, i) => {
    const o = options[i].data?.find((x) => x.tier === useTier) ?? options[i].data?.[0];
    const scenario = s.sizing && o ? evaluate({ coveragePct: s.coverage, kwp: o.arrayKwp || s.sizing.kwp, total: o.total, monthlySavings: s.sizing.monthlySavings }, { downPct: fin.downPct, termMonths: fin.termMonths, rateEA: rate }) : null;
    return { coverage: s.coverage, scenario };
  });
  // Los paneles se venden en paquetes: dos tamaños pueden terminar en el mismo kit. Mostrarlos con ahorros distintos y el mismo
  // precio engañaría, así que queda uno solo: el que la persona ya eligió o, si no, el de mayor cobertura.
  const same = (a: Scenario, b: Scenario) => a.total === b.total && a.kwp === b.kwp;
  const items = all.filter(({ scenario: sc }, _, list) => {
    if (!sc) return true;
    const group = list.filter((x) => x.scenario && same(x.scenario, sc));
    if (group.length === 1) return true;
    const keep = group.find((x) => x.coverage === current) ?? group.reduce((a, b) => (b.coverage > a.coverage ? b : a));
    return keep.scenario === sc;
  });
  const merged = items.length < all.length;
  const scenarios = items.map((x) => x.scenario);
  const hl = highlights(scenarios.filter((x): x is Scenario => x != null));
  const anySavings = scenarios.some((s) => s?.cash);

  return (
    <div className="cmp__body">
      <div className="cmp__controls">
        <div className="field">
          <label htmlFor={`${uid}d`}>{c.down}</label>
          <Select value={String(fin.downPct)} onValueChange={(v) => onFin({ downPct: Number(v) })}>
            <SelectTrigger id={`${uid}d`}><SelectValue /></SelectTrigger>
            <SelectContent>{DOWN.map((d) => <SelectItem key={d} value={String(d)}>{d} %</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="field">
          <label htmlFor={`${uid}t`}>{c.term}</label>
          <Select value={String(fin.termMonths)} onValueChange={(v) => onFin({ termMonths: Number(v) })}>
            <SelectTrigger id={`${uid}t`}><SelectValue /></SelectTrigger>
            <SelectContent>{TERMS.map((n) => <SelectItem key={n} value={String(n)}>{n} {c.months}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <p className="wiz__hint">{fill(c.rateUsed, { rate: pct(rate) })}</p>
      {!anySavings && <p className="wiz__hint" role="status">{c.noSavings}</p>}

      <ul className="cmp__cards">
        {items.map(({ coverage, scenario: s }) => {
          const mine = coverage === current;
          const badges = s ? [hl.fastestPayback === coverage && c.fastest, hl.bestNetCash === coverage && c.bestCash, hl.bestNetFinanced === coverage && c.bestFinanced].filter((b): b is string => Boolean(b)) : [];
          return (
            <li key={coverage} className={`cmp__card${mine ? " is-mine" : ""}`}>
              <header>
                <h4>{fill(c.cover, { pct: coverage })}</h4>
                {mine && <span className="cmp__mine">{c.mine}</span>}
              </header>
              {!s ? <p className="wiz__hint">{c.noKit}</p> : (
                <>
                  {badges.length > 0 && <ul className="cmp__badges">{badges.map((b) => <li key={b}>{b}</li>)}</ul>}
                  <dl className="cmp__facts">
                    <div><dt>{c.kwp}</dt><dd>{pct(s.kwp)} kWp</dd></div>
                    <div><dt>{c.kit} <small>({fill(c.kitTier, { tier: k.options.tiers[useTier] })})</small></dt><dd>{cop(s.total)}</dd></div>
                    {s.monthlySavings != null && s.monthlySavings > 0 && <div><dt>{c.monthlySavings}</dt><dd>{cop(s.monthlySavings)}</dd></div>}
                  </dl>

                  <div className="cmp__group">
                    <h5>{c.cash}</h5>
                    {s.cash ? (
                      <dl>
                        <div><dt>{c.payback}</dt><dd>{pct(s.cash.paybackYears)} {c.years}</dd></div>
                        <div><dt>{c.net}</dt><dd className={s.cash.netGain >= 0 ? "is-pos" : "is-neg"}>{cop(s.cash.netGain)}</dd></div>
                        <div><dt>{c.roi}</dt><dd>{s.cash.roiPct} %</dd></div>
                      </dl>
                    ) : <p className="wiz__hint">—</p>}
                  </div>

                  <div className="cmp__group">
                    <h5>{c.financed}</h5>
                    <dl>
                      <div><dt>{c.downPay}</dt><dd>{cop(s.financed.loan.down)}</dd></div>
                      <div><dt>{c.monthly}</dt><dd>{cop(s.financed.loan.monthly)}</dd></div>
                      {s.financed.monthlyFlow != null && (
                        <div className={s.financed.monthlyFlow >= 0 ? "is-pos" : "is-neg"}>
                          <dt>{s.financed.monthlyFlow >= 0 ? c.covered : c.short}</dt>
                          <dd>{cop(Math.abs(s.financed.monthlyFlow))} {c.perMonth}</dd>
                        </div>
                      )}
                      <div><dt>{c.totalPaid}</dt><dd>{cop(s.financed.loan.totalPaid)}</dd></div>
                      {s.financed.paybackMonths != null && <div><dt>{c.paybackPaid}</dt><dd>{s.financed.paybackMonths} {c.months}</dd></div>}
                      {s.financed.netGain != null && <div><dt>{c.net}</dt><dd className={s.financed.netGain >= 0 ? "is-pos" : "is-neg"}>{cop(s.financed.netGain)}</dd></div>}
                    </dl>
                  </div>
                  <Button type="button" variant={mine ? "outline" : "default"} disabled={mine} aria-label={`${mine ? c.using : c.use}: ${fill(c.cover, { pct: coverage })}`} onClick={() => onPick(coverage)}>{mine ? c.using : c.use}</Button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {merged && <p className="wiz__hint">{c.merged}</p>}
      <p className="wiz__privacy">{c.assumptions}</p>
    </div>
  );
}

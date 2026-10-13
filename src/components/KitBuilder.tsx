"use client";

import { useMemo, useState } from "react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { Candidate, KitInput, Selection, Slot, Tier } from "@/lib/kit";
import type { ExtraKey } from "@/lib/install-kit";
import type { Sizing } from "@/lib/sizing";
import { hasBattery, paybackYears } from "@/lib/sizing";
import { kitBaseOf, type ReviewValues } from "@/lib/wizard";
import { fill, money, num } from "@/lib/format";
import { useKit } from "@/hooks/useKit";
import { useKitOptions } from "@/hooks/useKitOptions";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/Loading";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SavingsPanel } from "./SavingsPanel";
import { QuoteRequestForm, type QuoteLine } from "./QuoteRequestForm";
import { SaveCalculation } from "./SaveCalculation";
import { ScenarioComparator } from "./ScenarioComparator";
import type { SimulationState } from "@/lib/simulation";
import { FinancingPanel, type FinState, initialFinancing, effectiveRate } from "./FinancingPanel";
import { useFinanceRates } from "@/hooks/useFinanceRates";

type SlotKey = "panels" | "inverter" | "batteries" | "structure";
type Sel = Selection & { panelQty?: number };

/** Lo que se guarda y se retoma de la configuración del kit (ver «Guarda tu cálculo»). */
export type KitInitial = SimulationState["kit"] & { fin: SimulationState["fin"] };
type Props = { t: Dict; lang: Locale; values: ReviewValues; sizing: Sizing; initial?: KitInitial; restoredAt?: string; onCoverage?: (pct: number) => void; onBack: () => void; onSent: (id: string, total: number, fulfillment: string) => void };

export function KitBuilder({ t, lang, values, sizing, initial, restoredAt, onCoverage, onBack, onSent }: Props) {
  const k = t.wiz.kit;
  // La opción elegida define la selección; al tocar un componente pasa a "custom" y la selección es la propia.
  const [tier, setTier] = useState<Tier | "custom">(initial?.tier ?? "balanced");
  const [custom, setCustom] = useState<Sel>((initial?.custom as Sel | undefined) ?? {});
  // Cantidades editadas a mano (no-paneles): se descartan solas si cambia lo que las originó.
  const [qtyEdits, setQtyEdits] = useState<Record<string, number>>(initial?.qtyEdits ?? {});
  // Complementos que el cliente decidió no incluir (p. ej. ya tiene gabinete).
  const [fin, setFin] = useState<FinState>(initial?.fin ?? initialFinancing);
  const finRates = useFinanceRates(fin.termMonths, fin.on); // misma consulta que usa el panel: React Query la comparte
  const [skipped, setSkipped] = useState<Partial<Record<ExtraKey, boolean>>>((initial?.skipped as Partial<Record<ExtraKey, boolean>> | undefined) ?? {});

  const base: Omit<KitInput, "selection"> = kitBaseOf(values, sizing);
  const { data: options } = useKitOptions(base);
  const sel: Sel = tier === "custom" ? custom : options?.find((o) => o.tier === tier)?.selection ?? {};
  const input: KitInput = { ...base, selection: sel };
  const { data: kit, isPending, isError, isFetching, refetch } = useKit(input);

  const slots = useMemo(() => {
    if (!kit) return [];
    const list: { key: SlotKey; slot: Slot }[] = [
      { key: "panels", slot: kit.panels },
      { key: "inverter", slot: kit.inverter },
      ...(kit.batteries ? [{ key: "batteries" as const, slot: kit.batteries }] : []),
      { key: "structure", slot: kit.structure },
    ];
    return list;
  }, [kit]);

  const upstream = `${kit?.panelCount}|${kit?.inverter.selectedId}`;
  const lines = useMemo(() => {
    const out: (QuoteLine & { slot: SlotKey; c: Candidate })[] = [];
    for (const { key, slot } of slots) {
      const c = slot.candidates.find((x) => x.id === slot.selectedId);
      if (!c) continue;
      const qty = key === "panels" ? c.qty : qtyEdits[`${key}:${c.id}:${upstream}`] ?? c.qty;
      if (qty > 0) out.push({ slot: key, c, productId: c.id, qty, name: c.name, unitPrice: c.price });
    }
    return out;
  }, [slots, qtyEdits, upstream]);

  const extraLines = useMemo(() => {
    const out: { key: ExtraKey; c: Candidate; qty: number; unit: "u" | "m"; slot: Slot & { key: ExtraKey; unit: "u" | "m" } }[] = [];
    for (const e of kit?.extras ?? []) {
      const c = e.candidates.find((x) => x.id === e.selectedId);
      if (c) out.push({ key: e.key, c, qty: qtyEdits[`extra:${e.key}:${c.id}:${upstream}`] ?? c.qty, unit: e.unit, slot: e });
    }
    return out;
  }, [kit, qtyEdits, upstream]);
  const quoteLines: QuoteLine[] = [
    ...lines,
    ...extraLines.filter((l) => !skipped[l.key] && l.qty > 0).map((l) => ({ productId: l.c.id, qty: l.qty, name: l.c.name, unitPrice: l.c.price })),
  ];
  const total = quoteLines.reduce((n, l) => n + l.unitPrice * l.qty, 0);
  const payback = paybackYears(total, sizing.monthlySavings);

  function setSel(f: (s: Sel) => Sel) {
    setCustom(f(sel));
    setTier("custom");
  }
  function pickTier(o: Tier) {
    setTier(o);
    setQtyEdits({});
  }
  function chooseExtra(key: ExtraKey, id: string) {
    setCustom({ ...sel, extras: { ...sel.extras, [key]: id } });
    setTier("custom");
  }
  function setExtraQty(key: ExtraKey, c: Candidate, n: number) {
    const qty = Math.max(1, Math.min(2000, Math.round(n) || 1));
    setQtyEdits((e) => ({ ...e, [`extra:${key}:${c.id}:${upstream}`]: qty }));
  }

  function choose(key: SlotKey, id: string) {
    if (key === "panels") setSel((s) => ({ ...s, panelId: id, panelQty: undefined, inverterId: undefined, batteryId: undefined }));
    else if (key === "inverter") setSel((s) => ({ ...s, inverterId: id, batteryId: undefined }));
    else if (key === "batteries") setSel((s) => ({ ...s, batteryId: id }));
    else setSel((s) => ({ ...s, structureId: id }));
  }
  function setQty(key: SlotKey, c: Candidate, n: number) {
    const qty = Math.max(1, Math.min(2000, Math.round(n) || 1));
    if (key === "panels") setSel((s) => ({ ...s, panelId: c.id, panelQty: qty, inverterId: undefined, batteryId: undefined }));
    else setQtyEdits((e) => ({ ...e, [`${key}:${c.id}:${upstream}`]: qty }));
  }

  return (
    <div className="wiz__kit">
      {restoredAt && <p className="wiz__hint" role="status">{fill(t.wiz.save.restored, { date: new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(new Date(restoredAt)) })}</p>}
      <section className="wiz__sizing" aria-label={k.sizing}>
        <h3>{k.sizing}</h3>
        <dl className="wiz__facts">
          <div><dt>{k.kwp}</dt><dd>{sizing.kwp} kWp</dd></div>
          {kit && kit.panelCount > 0 && <div><dt>{k.array}</dt><dd>{kit.arrayKwp} kWp <small>{fill(k.panelsN, { n: kit.panelCount })}</small></dd></div>}
          <div><dt>{k.gen}</dt><dd>{num(lang, Math.round(sizing.monthlySolarKwh))} kWh <small>{k.perMonth}</small></dd></div>
          {sizing.monthlySavings != null && <div><dt>{k.savings}</dt><dd>{money(lang, sizing.monthlySavings, "COP")} <small>{k.perMonth}</small></dd></div>}
          <div><dt>{k.inverterRange}</dt><dd>{sizing.inverterKw.min}–{sizing.inverterKw.max} kW</dd></div>
          {hasBattery(values.systemType) && <div><dt>{k.battery}</dt><dd>{sizing.batteryNominalKwh} kWh</dd></div>}
        </dl>
      </section>

      {isPending ? (
        <Loading label={k.loading} rows={5} />
      ) : isError || !kit ? (
        <p role="alert">{k.loadError} <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>{k.retry}</Button></p>
      ) : (
        <>
          {kit.warnings.length > 0 && (
            <ul className="wiz__warn" role="status">{kit.warnings.map((w) => <li key={w}>{k.warnings[w]}</li>)}</ul>
          )}

          {options && options.length > 0 && (
            <section className="wiz__options" aria-label={k.options.title}>
              <h3>{k.options.title}</h3>
              <p className="wiz__hint">{k.options.sub}</p>
              <div className="wiz__tiers" role="radiogroup" aria-label={k.options.title}>
                {options.map((o) => {
                  const payback = paybackYears(o.total, sizing.monthlySavings);
                  return (
                    <button key={o.tier} type="button" role="radio" aria-checked={tier === o.tier} className="wiz__tier" onClick={() => pickTier(o.tier)}>
                      <span className="wiz__tiername">{k.options.tiers[o.tier]}{o.tier === "balanced" && <em>{k.options.recommended}</em>}</span>
                      <strong className="wiz__tierprice">{money(lang, o.total, "COP")}</strong>
                      <ul>
                        <li>{fill(k.panelsN, { n: o.panelCount })} · {o.arrayKwp} kWp</li>
                        {o.inverter && <li>{o.inverter}</li>}
                        {o.battery && <li>{o.battery}</li>}
                      </ul>
                      {payback != null && <small>{k.payback}: {payback} {payback === 1 ? k.year : k.years}</small>}
                    </button>
                  );
                })}
              </div>
              {tier === "custom" && <p className="wiz__hint" role="status">{k.options.custom}</p>}
            </section>
          )}

          <div className="wiz__slots" aria-busy={isFetching}>
            {slots.map(({ key, slot }) => {
              const sel = slot.candidates.find((x) => x.id === slot.selectedId);
              const line = lines.find((l) => l.slot === key);
              return (
                <section key={key} className="wiz__slot" aria-label={k.slots[key]}>
                  <h3>{k.slots[key]}</h3>
                  {!sel ? (
                    <p className="wiz__hint">{k.empty}</p>
                  ) : (
                    <>
                      <div className="wiz__slotbody">
                        {sel.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="wiz__thumb" src={sel.image} alt="" loading="lazy" />
                        )}
                        <div className="wiz__pick">
                          <Select value={sel.id} onValueChange={(id) => choose(key, id)} disabled={slot.candidates.length < 2}>
                            <SelectTrigger aria-label={k.slots[key]}><SelectValue>{sel.name}</SelectValue></SelectTrigger>
                            <SelectContent>
                              {slot.candidates.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  <span className="wiz__opt">{c.name}<small>{money(lang, c.price, "COP")} {k.unit} · {c.manufacturer}{c.packQty > 1 && key !== "structure" ? ` · ${fill(k.pack, { n: c.packQty })}` : ""}</small></span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {sel.dcAc != null && <span className="wiz__hint">{k.dcAc}: {sel.dcAc.toFixed(2)}</span>}
                        </div>
                      </div>
                      <div className="wiz__line">
                        <div className="field wiz__qty">
                          <label htmlFor={`qty-${key}`}>{k.qty}{sel.packQty > 1 && key !== "structure" ? ` (${fill(k.pack, { n: sel.packQty })})` : ""}</label>
                          <Input id={`qty-${key}`} type="number" inputMode="numeric" min={1} max={2000} value={line?.qty ?? 1} onChange={(e) => setQty(key, sel, Number(e.target.value))} />
                        </div>
                        <strong className="wiz__sub">{money(lang, (line?.qty ?? 0) * sel.price, "COP")}</strong>
                      </div>
                    </>
                  )}
                </section>
              );
            })}
          </div>

          {extraLines.length > 0 && (
            <section className="wiz__extras" aria-label={k.extras.title}>
              <h3>{k.extras.title}</h3>
              <p className="wiz__hint">{k.extras.sub}</p>
              <ul>
                {extraLines.map(({ key, c, qty, unit, slot }) => {
                  const off = Boolean(skipped[key]);
                  return (
                    <li key={key} className={off ? "is-off" : ""}>
                      <label className="wiz__extra-on">
                        <input type="checkbox" checked={!off} onChange={(e) => setSkipped((s) => ({ ...s, [key]: !e.target.checked }))} />
                        <span>{k.extras.items[key]}</span>
                      </label>
                      <div className="wiz__extra-pick">
                        <Select value={c.id} onValueChange={(id) => chooseExtra(key, id)} disabled={off || slot.candidates.length < 2}>
                          <SelectTrigger size="sm" aria-label={k.extras.items[key]}><SelectValue>{c.name}</SelectValue></SelectTrigger>
                          <SelectContent>
                            {slot.candidates.map((x) => (
                              <SelectItem key={x.id} value={x.id}><span className="wiz__opt">{x.name}<small>{money(lang, x.price, "COP")} {unit === "m" ? k.extras.perMeter : k.unit}</small></span></SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="wiz__extra-qty">
                        <Input aria-label={`${k.qty}: ${k.extras.items[key]}`} type="number" inputMode="numeric" min={1} max={2000} value={qty} disabled={off} onChange={(e) => setExtraQty(key, c, Number(e.target.value))} />
                        <span>{unit === "m" ? "m" : "u"}</span>
                      </div>
                      <strong className="wiz__extra-total">{off ? "—" : money(lang, c.price * qty, "COP")}</strong>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="wiz__total" aria-live="polite">
            <div>
              <span>{k.total}</span>
              <strong>{money(lang, total, "COP")}</strong>
            </div>
            {payback != null && <div><span>{k.payback}</span><strong>{payback} {payback === 1 ? k.year : k.years}</strong></div>}
          </section>
          <SavingsPanel t={t} lang={lang} monthlyKwh={Number(values.monthlyKwh.replace(",", "."))} tariff={Number(values.tariff.replace(",", ".")) || null} monthlySavings={sizing.monthlySavings} kwp={kit.arrayKwp || sizing.kwp} total={total} />
          <FinancingPanel t={t} lang={lang} total={total} monthlySavings={sizing.monthlySavings} value={fin} onChange={setFin} />
          <ScenarioComparator
            t={t}
            lang={lang}
            values={values}
            tier={tier}
            fin={fin}
            onFin={(patch) => setFin((f) => ({ ...f, ...patch }))}
            onPick={(pct) => {
              // Otro tamaño cambia los componentes compatibles: se vuelve al kit equilibrado y se descartan las ediciones a mano.
              setTier("balanced");
              setCustom({});
              setQtyEdits({});
              onCoverage?.(pct);
            }}
          />
          <p className="wiz__privacy">{k.note}</p>

          <SaveCalculation
            t={t}
            lang={lang}
            total={total}
            paybackYears={payback}
            state={{
              values: values as SimulationState["values"],
              kit: { tier, custom: tier === "custom" ? (custom as SimulationState["kit"]["custom"]) : {}, qtyEdits, skipped: Object.fromEntries(Object.entries(skipped).filter(([, v]) => v)) },
              fin: { on: fin.on, downPct: fin.downPct, termMonths: fin.termMonths, rate: fin.rate, entity: fin.entity },
            }}
          />

          <QuoteRequestForm
            t={t}
            lang={lang}
            lines={quoteLines}
            values={values}
            sizing={sizing}
            total={total}
            financing={fin.on ? { downPct: fin.downPct, termMonths: fin.termMonths, rateEA: effectiveRate(fin, finRates.data?.market ?? null, finRates.data?.usury?.usuryEA ?? null), entity: fin.entity } : undefined}
            disabled={lines.length === 0}
            onSent={onSent}
          />
        </>
      )}

      <div className="wiz__actions">
        <Button type="button" variant="outline" onClick={onBack}>{t.wiz.review.back}</Button>
      </div>
    </div>
  );
}

"use client";

import { useId } from "react";
import { AirVent, CookingPot, Fan, Laptop, Lightbulb, Microwave, Minus, Plus, Refrigerator, ShowerHead, Shirt, Snowflake, Tv, Utensils, WashingMachine, Wind, type LucideIcon } from "lucide-react";
import type { Dict } from "@/i18n";
import { APPLIANCES, CLASSES, MAX_QTY, type ApplianceId, type ApplianceRow, invalidRows, newRow, rowKwh, rowQty, totalKwh } from "@/lib/appliances";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = { t: Dict; rows: ApplianceRow[]; onChange: (rows: ApplianceRow[]) => void; onBack: () => void; onUse: (monthlyKwh: number) => void };

const ICONS: Record<ApplianceId, LucideIcon> = {
  fridge: Refrigerator, freezer: Snowflake, washer: WashingMachine, dryer: Wind, dishwasher: Utensils, ac: AirVent, tv: Tv,
  bulb: Lightbulb, waterHeater: ShowerHead, microwave: Microwave, oven: CookingPot, fan: Fan, computer: Laptop, iron: Shirt,
};

const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString("es-CO", { maximumFractionDigits: 1 });

export function ApplianceEstimator({ t, rows, onChange, onBack, onUse }: Props) {
  const a = t.wiz.appliances;
  const uid = useId().replace(/:/g, "");
  const bad = invalidRows(rows);
  const total = totalKwh(rows);
  const canUse = rows.length > 0 && bad.size === 0 && total > 0;
  const byId = new Map(rows.map((r) => [r.appliance, r]));

  const patch = (id: ApplianceId, p: Partial<ApplianceRow>) => onChange(rows.map((r) => (r.appliance === id ? { ...r, ...p } : r)));
  const toggle = (id: ApplianceId) => onChange(byId.has(id) ? rows.filter((r) => r.appliance !== id) : [...rows, newRow(id)]);
  // Con 1 unidad, «menos» desmarca el equipo.
  const step = (r: ApplianceRow, d: 1 | -1) => {
    const q = rowQty(r) + d;
    if (q < 1) return toggle(r.appliance);
    if (q <= MAX_QTY) patch(r.appliance, { qty: String(q) });
  };

  return (
    <form className="wiz__form" onSubmit={(e) => { e.preventDefault(); if (canUse) onUse(total); }} noValidate>
      <p className="wiz__hint">{a.intro}</p>

      <ul className="appl__grid">
        {APPLIANCES.map((x) => {
          const r = byId.get(x.id);
          const Icon = ICONS[x.id];
          const name = a.names[x.id];
          return (
            <li key={x.id} className={`appl__card ${r ? "is-on" : ""}`}>
              <button type="button" className="appl__pick" aria-pressed={!!r} onClick={() => toggle(x.id)}>
                <Icon aria-hidden="true" />
                <span>{name}</span>
              </button>

              {r && (
                <div className="appl__ctl">
                  <div className="appl__qty" role="group" aria-label={`${a.qty}: ${name}`}>
                    <button type="button" aria-label={`${a.less}: ${name}`} onClick={() => step(r, -1)}><Minus aria-hidden="true" /></button>
                    <output aria-live="polite">{rowQty(r) || r.qty}</output>
                    <button type="button" aria-label={`${a.more}: ${name}`} onClick={() => step(r, 1)} disabled={rowQty(r) >= MAX_QTY}><Plus aria-hidden="true" /></button>
                  </div>
                  {x.labeled && (
                    <div className="field">
                      <label htmlFor={`${uid}${x.id}c`}>{a.class}</label>
                      <Select value={r.cls} onValueChange={(v) => patch(x.id, { cls: v as ApplianceRow["cls"] })}>
                        <SelectTrigger id={`${uid}${x.id}c`}><SelectValue>{r.cls}</SelectValue></SelectTrigger>
                        <SelectContent>
                          {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <details className="appl__label" open={r.label !== ""}>
                    <summary>{a.labelToggle}</summary>
                    <div className="field">
                      <label htmlFor={`${uid}${x.id}l`}>{a.label}</label>
                      <Input id={`${uid}${x.id}l`} type="number" inputMode="decimal" min={0} step="any" value={r.label} placeholder={a.labelPlaceholder} onChange={(e) => patch(x.id, { label: e.target.value })} aria-invalid={bad.has(r.id) || undefined} aria-describedby={bad.has(r.id) ? `${uid}${x.id}e` : undefined} />
                      {bad.has(r.id) && <span id={`${uid}${x.id}e`} className="field-error">{a.invalid}</span>}
                    </div>
                  </details>
                  <strong className="appl__kwh">{fmt(rowKwh(r))} kWh/{a.month}</strong>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="appl__total" role="status" aria-live="polite">
        {a.total}: <strong>{fmt(total)} kWh/{a.month}</strong>
      </p>
      {rows.length === 0 && <p className="wiz__hint">{a.empty}</p>}
      <p className="wiz__hint">{a.disclaimer}</p>

      <div className="wiz__actions">
        <Button type="button" variant="outline" onClick={onBack}>{a.back}</Button>
        <Button type="submit" disabled={!canUse}>{a.use}</Button>
      </div>
    </form>
  );
}

"use client";

import { useId } from "react";
import type { Dict } from "@/i18n";
import { APPLIANCES, CLASSES, type ApplianceId, type ApplianceRow, invalidRows, isLabeled, newRow, rowKwh, totalKwh } from "@/lib/appliances";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = { t: Dict; rows: ApplianceRow[]; onChange: (rows: ApplianceRow[]) => void; nextId: () => string; onBack: () => void; onUse: (monthlyKwh: number) => void };

const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString("es-CO", { maximumFractionDigits: 1 });

export function ApplianceEstimator({ t, rows, onChange, nextId, onBack, onUse }: Props) {
  const a = t.wiz.appliances;
  const uid = useId().replace(/:/g, "");
  const bad = invalidRows(rows);
  const total = totalKwh(rows);
  const canUse = rows.length > 0 && bad.size === 0 && total > 0;

  const patch = (id: string, p: Partial<ApplianceRow>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...p } : r)));

  return (
    <form className="wiz__form" onSubmit={(e) => { e.preventDefault(); if (canUse) onUse(total); }} noValidate>
      <p className="wiz__hint">{a.intro}</p>

      {rows.length === 0 && <p className="wiz__hint" role="status">{a.empty}</p>}

      <ul className="appl__list">
        {rows.map((r, i) => {
          const labeled = isLabeled(r.appliance);
          const invalid = bad.has(r.id);
          const name = a.names[r.appliance];
          return (
            <li key={r.id} className="appl__row" aria-label={`${name} ${i + 1}`}>
              <div className="field">
                <label htmlFor={`${uid}${r.id}n`}>{a.appliance}</label>
                <Select value={r.appliance} onValueChange={(v) => patch(r.id, { appliance: v as ApplianceId })}>
                  <SelectTrigger id={`${uid}${r.id}n`}><SelectValue>{name}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {APPLIANCES.map((x) => <SelectItem key={x.id} value={x.id}>{a.names[x.id]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="field">
                <label htmlFor={`${uid}${r.id}q`}>{a.qty}</label>
                <Input id={`${uid}${r.id}q`} type="number" inputMode="numeric" min={1} max={99} step={1} value={r.qty} onChange={(e) => patch(r.id, { qty: e.target.value })} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${uid}${r.id}e` : undefined} />
              </div>
              <div className="field">
                <label htmlFor={`${uid}${r.id}c`}>{a.class}</label>
                {labeled ? (
                  <Select value={r.cls} onValueChange={(v) => patch(r.id, { cls: v as ApplianceRow["cls"] })}>
                    <SelectTrigger id={`${uid}${r.id}c`}><SelectValue>{r.cls}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input id={`${uid}${r.id}c`} value={a.noClass} disabled readOnly />
                )}
              </div>
              <div className="field">
                <label htmlFor={`${uid}${r.id}l`}>{a.label}</label>
                <Input id={`${uid}${r.id}l`} type="number" inputMode="decimal" min={0} step="any" value={r.label} placeholder={a.labelPlaceholder} onChange={(e) => patch(r.id, { label: e.target.value })} />
              </div>
              <div className="appl__sum">
                <strong>{fmt(rowKwh(r))} kWh</strong>
                <button type="button" className="wiz__link" aria-label={`${a.remove}: ${name}`} onClick={() => onChange(rows.filter((x) => x.id !== r.id))}>{a.remove}</button>
              </div>
              {invalid && <span id={`${uid}${r.id}e`} className="field-error appl__err">{a.invalid}</span>}
            </li>
          );
        })}
      </ul>

      <div className="wiz__actions">
        <Button type="button" variant="outline" onClick={() => onChange([...rows, newRow(nextId())])}>{a.add}</Button>
      </div>

      <p className="appl__total" role="status" aria-live="polite">
        {a.total}: <strong>{fmt(total)} kWh/{a.month}</strong>
      </p>
      <p className="wiz__hint">{a.disclaimer}</p>

      <div className="wiz__actions">
        <Button type="button" variant="outline" onClick={onBack}>{a.back}</Button>
        <Button type="submit" disabled={!canUse}>{a.use}</Button>
      </div>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { money } from "@/lib/format";
import { KIT_KINDS, kitEditable } from "@/lib/quote-flow";
import { type CatalogHit, type QuoteDetail, useQuoteCatalog, useSaveQuoteItems } from "@/hooks/useQuotes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Line = { key: string; productId: string | null; kind: string; name: string; unitPrice: number; qty: number };
type Picking = { mode: "add" } | { mode: "swap"; key: string };

const ALL = "all";
const fromQuote = (r: QuoteDetail): Line[] => r.items.map((i) => ({ key: i.id, productId: i.productId, kind: i.kind, name: i.name, unitPrice: i.unitPrice, qty: i.qty }));

function Picker({ t, lang, currency, kind: initialKind, title, onPick, onClose }: { t: Dict; lang: Locale; currency: string; kind: string; title: string; onPick: (p: CatalogHit) => void; onClose: () => void }) {
  const e = t.app.quotes.edit;
  const uid = useId().replace(/:/g, "");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState(initialKind || ALL);
  const { data, isPending } = useQuoteCatalog(q.trim(), kind === ALL ? "" : kind);
  return (
    <div className="kedit__picker" role="group" aria-label={title}>
      <p className="kedit__title">{title}</p>
      <div className="kedit__filters">
        <div className="field">
          <label htmlFor={`${uid}k`}>{e.kind}</label>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger id={`${uid}k`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{e.allKinds}</SelectItem>
              {KIT_KINDS.map((k) => <SelectItem key={k} value={k}>{e.kinds[k]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="field">
          <label htmlFor={`${uid}q`}>{e.search}</label>
          <Input id={`${uid}q`} type="search" value={q} maxLength={100} onChange={(ev) => setQ(ev.target.value)} autoFocus />
        </div>
      </div>
      <ul className="kedit__results">
        {isPending ? null : data?.length ? data.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onPick(p)}>
              <span>{p.name}</span>
              <small>{e.kinds[p.kind as keyof typeof e.kinds]} · {money(lang, p.unitPrice, currency)}</small>
            </button>
          </li>
        )) : <li className="panel__meta">{e.noResults}</li>}
      </ul>
      <Button type="button" variant="outline" size="sm" onClick={onClose}>{e.close}</Button>
    </div>
  );
}

/** Kit de la solicitud: tabla de lectura y, mientras la solicitud sigue abierta, edición para el asesor. */
export function QuoteKitSection({ t, lang, r }: { t: Dict; lang: Locale; r: QuoteDetail }) {
  const q = t.app.quotes;
  const e = q.edit;
  const save = useSaveQuoteItems();
  const [editing, setEditing] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [picking, setPicking] = useState<Picking | null>(null);
  const [error, setError] = useState("");
  const editable = kitEditable(r.status);

  const start = () => { setLines(fromQuote(r)); setPicking(null); setError(""); setEditing(true); };
  const stop = () => { setEditing(false); setPicking(null); setError(""); };
  const total = (editing ? lines.filter((l) => l.productId) : fromQuote(r)).reduce((n, l) => n + l.unitPrice * l.qty, 0);
  const setQty = (key: string, v: string) => setLines((cur) => cur.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(9999, Math.floor(Number(v)) || 1)) } : l)));

  function pick(p: CatalogHit) {
    setLines((cur) => {
      if (picking?.mode === "swap") {
        const k = picking.key;
        // Si el producto elegido ya está en el kit, se suman las cantidades.
        const dup = cur.find((l) => l.productId === p.id && l.key !== k);
        const old = cur.find((l) => l.key === k);
        if (dup) return cur.filter((l) => l.key !== k).map((l) => (l === dup ? { ...l, qty: l.qty + (old?.qty ?? 0) } : l));
        return cur.map((l) => (l.key === k ? { key: `n${p.id}`, productId: p.id, kind: p.kind, name: p.name, unitPrice: p.unitPrice, qty: l.qty } : l));
      }
      const dup = cur.find((l) => l.productId === p.id);
      if (dup) return cur.map((l) => (l === dup ? { ...l, qty: l.qty + 1 } : l));
      return [...cur, { key: `n${p.id}`, productId: p.id, kind: p.kind, name: p.name, unitPrice: p.unitPrice, qty: 1 }];
    });
    setPicking(null);
  }

  function onSave() {
    const items = lines.filter((l) => l.productId).map((l) => ({ productId: l.productId!, qty: l.qty }));
    if (items.length === 0) { setError(e.empty); return; }
    setError("");
    save.mutate({ id: r.id, items }, {
      onSuccess: stop,
      onError: (err) => setError(e.errors[(err as Error & { code?: string }).code as keyof typeof e.errors] ?? e.errors.generic),
    });
  }

  const swapLine = picking?.mode === "swap" ? lines.find((l) => l.key === picking.key) : undefined;

  return (
    <section className="panel" aria-labelledby={`kit-${r.id}`}>
      <div className="panel__row">
        <h2 id={`kit-${r.id}`} className="panel__title">{q.kit}</h2>
        {editable && !editing && <Button type="button" variant="outline" size="sm" onClick={start}>{e.button}</Button>}
      </div>
      {r.originalTotal != null && (
        <p className="panel__meta"><Badge variant="outline">{e.changed}</Badge> {e.original}: {money(lang, r.originalTotal, r.currency)}</p>
      )}
      {editing && <p className="wiz__hint">{e.hint}</p>}

      <div className="tbl-wrap">
        <table className="tbl tbl--compact">
          <thead>
            <tr><th scope="col">{q.product}</th><th scope="col" className="num">{q.qty}</th><th scope="col" className="num">{q.subtotal}</th></tr>
          </thead>
          <tbody>
            {(editing ? lines : fromQuote(r)).map((i) => (
              <tr key={i.key}>
                <th scope="row">
                  {i.productId && !editing ? <Link href={`/${lang}/app/products/${i.productId}`}>{i.name}</Link> : <>{i.name}{!i.productId && <> <Badge variant="outline">{q.removedProduct}</Badge></>}</>}
                  <span className="tbl__sub">{q.unit}: {money(lang, i.unitPrice, r.currency)}</span>
                  {editing && (
                    <span className="kedit__row">
                      {i.productId
                        ? <Button type="button" variant="outline" size="sm" onClick={() => setPicking({ mode: "swap", key: i.key })}>{e.swap}</Button>
                        : <small>{e.removed}</small>}
                      <Button type="button" variant="outline" size="sm" onClick={() => { setLines((cur) => cur.filter((l) => l.key !== i.key)); setPicking(null); }}>{e.remove}</Button>
                    </span>
                  )}
                </th>
                <td className="num">
                  {editing && i.productId
                    ? <Input type="number" inputMode="numeric" min={1} max={9999} aria-label={`${e.qty}: ${i.name}`} className="kedit__qty" value={i.qty} onChange={(ev) => setQty(i.key, ev.target.value)} />
                    : i.qty}
                </td>
                <td className="num"><strong>{money(lang, i.unitPrice * i.qty, r.currency)}</strong></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><th scope="row" colSpan={2}>{q.total}</th><td className="num"><strong>{money(lang, editing ? total : r.total, r.currency)}</strong></td></tr>
          </tfoot>
        </table>
      </div>

      {editing && (
        <div className="kedit">
          {picking ? (
            <Picker
              key={picking.mode === "swap" ? picking.key : "add"}
              t={t} lang={lang} currency={r.currency}
              kind={swapLine?.kind ?? ""}
              title={swapLine ? `${e.pickSwap}: ${swapLine.name}` : e.pickAdd}
              onPick={pick}
              onClose={() => setPicking(null)}
            />
          ) : (
            <Button type="button" variant="outline" onClick={() => setPicking({ mode: "add" })}>{e.add}</Button>
          )}
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="flow__actions">
            <Button type="button" disabled={save.isPending} onClick={onSave}>{save.isPending ? e.saving : e.save}</Button>
            <Button type="button" variant="outline" disabled={save.isPending} onClick={stop}>{e.cancel}</Button>
          </div>
        </div>
      )}
    </section>
  );
}

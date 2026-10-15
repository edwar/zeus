"use client";

import { useId, useState } from "react";
import { PackageOpen } from "lucide-react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fill, money, num } from "@/lib/format";
import { type StockRow, useAdjustStock, useDisableStock, useEnableStock, useReceiveStock, useSetMinQty, useStock, useStockCandidates, useStockMoves } from "@/hooks/useStock";
import { useConfirm } from "@/components/ConfirmProvider";
import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";

type Texts = Dict["app"]["stock"];
const errText = (m: Texts, e: unknown) => m.errors[(e as { code?: string }).code as keyof Texts["errors"]] ?? m.errors.generic;
const toNum = (s: string) => (s.trim() === "" ? NaN : Number(s));

/** Inventario propio: lo que se compra para tener en bodega. Lo que se pide al proveedor al aprobar no pasa por aquí. */
export function StockManager({ t, lang }: { t: Dict; lang: Locale }) {
  const m = t.app.stock;
  const { data, isPending, isError, refetch } = useStock();
  const disable = useDisableStock();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [receiving, setReceiving] = useState<StockRow | null>(null);
  const [adjusting, setAdjusting] = useState<StockRow | null>(null);
  const [history, setHistory] = useState<StockRow | null>(null);
  const [msg, setMsg] = useState("");
  const low = data?.filter((r) => r.low).length ?? 0;

  async function remove(r: StockRow) {
    if (!(await confirm({ message: m.confirmRemove, subject: r.name, confirmLabel: m.remove }))) return;
    setMsg("");
    disable.mutate(r.productId, { onError: (e) => setMsg(errText(m, e)) });
  }

  return (
    <div className="pb">
      <header className="ph">
        <div>
          <h1 className="ph__title">{m.title}</h1>
          <p className="ph__sub">{m.sub}</p>
        </div>
        <div className="ph__tools"><Button type="button" onClick={() => setAdding(true)}>{m.add}</Button></div>
      </header>
      <p role="status" className={msg ? "field-error" : "sr-only"}>{msg}</p>

      {isPending ? (
        <Loading label={m.loading} variant="table" cols={6} />
      ) : isError ? (
        <p role="alert">{m.loadError} <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>{m.retry}</Button></p>
      ) : data.length === 0 ? (
        <EmptyState icon={PackageOpen} title={m.empty.title} description={m.empty.desc}>
          <Button type="button" onClick={() => setAdding(true)}>{m.add}</Button>
        </EmptyState>
      ) : (
        <>
          <p className="wiz__hint">{fill(m.summary, { n: data.length, low })}</p>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th scope="col">{m.cols.product}</th><th scope="col">{m.cols.onHand}</th><th scope="col">{m.cols.min}</th><th scope="col">{m.cols.cost}</th><th scope="col">{m.cols.pending}</th><th scope="col"><span className="sr-only">{m.cols.actions}</span></th></tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.productId}>
                    <td>
                      <strong>{r.name}</strong>
                      <div className="tbl__sub">{r.manufacturer}{r.sku ? ` · ${r.sku}` : ""} · {r.source === "autosolar" ? m.sourceAutosolar : m.sourceManual}</div>
                    </td>
                    <td>
                      <strong>{num(lang, r.onHand)}</strong>{" "}
                      {r.low && <Badge variant="warning">{r.onHand <= 0 ? m.out : m.low}</Badge>}
                    </td>
                    <td><MinEditor r={r} m={m} onError={(e) => setMsg(errText(m, e))} /></td>
                    <td>{r.avgCost == null ? "—" : money(lang, r.avgCost, "COP")}</td>
                    <td>{r.pending > 0 ? num(lang, r.pending) : "—"}</td>
                    <td>
                      <div className="flow__actions">
                        <Button type="button" size="sm" onClick={() => setReceiving(r)}>{m.receive}</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setAdjusting(r)}>{m.adjust}</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setHistory(r)}>{m.history}</Button>
                        <Button type="button" variant="outline" size="sm" disabled={disable.isPending} onClick={() => remove(r)}>{m.remove}</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="wiz__hint">{m.costNote}</p>
        </>
      )}

      <AddDialog open={adding} onClose={() => setAdding(false)} t={t} lang={lang} />
      <ReceiveDialog row={receiving} onClose={() => setReceiving(null)} t={t} lang={lang} />
      <AdjustDialog row={adjusting} onClose={() => setAdjusting(null)} t={t} />
      <HistoryDialog row={history} onClose={() => setHistory(null)} t={t} lang={lang} />
    </div>
  );
}

/** Mínimo editable en la misma fila: al salir del campo se guarda si cambió. */
function MinEditor({ r, m, onError }: { r: StockRow; m: Texts; onError: (e: unknown) => void }) {
  const set = useSetMinQty(r.productId);
  const [v, setV] = useState(String(r.minQty));
  return (
    <Input
      type="number" inputMode="numeric" min={0} step={1} value={v} aria-label={fill(m.minFor, { name: r.name })} className="w-24"
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { const n = toNum(v); if (Number.isInteger(n) && n >= 0 && n !== r.minQty) set.mutate(n, { onError }); else setV(String(r.minQty)); }}
    />
  );
}

function AddDialog({ open, onClose, t, lang }: { open: boolean; onClose: () => void; t: Dict; lang: Locale }) {
  const m = t.app.stock;
  const uid = useId().replace(/:/g, "");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<{ id: string; name: string; supplierPrice: number | null } | null>(null);
  const [onHand, setOnHand] = useState("0");
  const [cost, setCost] = useState("");
  const [min, setMin] = useState("0");
  const [error, setError] = useState("");
  const found = useStockCandidates(q, open && !picked);
  const enable = useEnableStock();
  const reset = () => { setQ(""); setPicked(null); setOnHand("0"); setCost(""); setMin("0"); setError(""); };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) return;
    const n = toNum(onHand), mn = toNum(min), c = toNum(cost);
    if (!Number.isInteger(n) || n < 0 || !Number.isInteger(mn) || mn < 0 || (n > 0 && !(c >= 0))) { setError(m.errors.invalid_body); return; }
    setError("");
    enable.mutate({ productId: picked.id, onHand: n, unitCost: Number.isFinite(c) ? c : null, minQty: mn }, { onSuccess: () => { reset(); onClose(); }, onError: (err) => setError(errText(m, err)) });
  }
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.addTitle}</DialogTitle>
          <DialogDescription>{m.addSub}</DialogDescription>
        </DialogHeader>
        <form className="uform uform--modal" onSubmit={submit}>
          {!picked ? (
            <div className="field">
              <label htmlFor={`${uid}q`}>{m.search}</label>
              <Input id={`${uid}q`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.searchPh} autoComplete="off" />
              <ul className="stockpick" aria-live="polite">
                {found.data?.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => { setPicked(c); if (c.supplierPrice != null) setCost(String(Math.round(c.supplierPrice))); }}>
                      <strong>{c.name}</strong><small>{c.manufacturer}{c.sku ? ` · ${c.sku}` : ""} · {c.source === "autosolar" ? m.sourceAutosolar : m.sourceManual}</small>
                    </button>
                  </li>
                ))}
                {found.data?.length === 0 && <li className="panel__meta">{m.none}</li>}
              </ul>
            </div>
          ) : (
            <>
              <p><strong>{picked.name}</strong> <Button type="button" variant="outline" size="sm" onClick={() => setPicked(null)}>{m.change}</Button></p>
              <div className="field"><label htmlFor={`${uid}n`}>{m.onHand}</label><Input id={`${uid}n`} type="number" inputMode="numeric" min={0} step={1} value={onHand} onChange={(e) => setOnHand(e.target.value)} /></div>
              <div className="field"><label htmlFor={`${uid}c`}>{m.unitCost}</label><MoneyInput id={`${uid}c`} value={cost} onValueChange={setCost} /><span className="uform__hint">{m.unitCostHint}</span></div>
              <div className="field"><label htmlFor={`${uid}m`}>{m.minQty}</label><Input id={`${uid}m`} type="number" inputMode="numeric" min={0} step={1} value={min} onChange={(e) => setMin(e.target.value)} /><span className="uform__hint">{m.minHint}</span></div>
            </>
          )}
          <p className="field-error" role="alert" hidden={!error}>{error}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>{m.cancel}</Button>
            <Button type="submit" disabled={!picked || enable.isPending}>{enable.isPending ? m.creating : m.create}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReceiveDialog({ row, onClose, t, lang }: { row: StockRow | null; onClose: () => void; t: Dict; lang: Locale }) {
  const m = t.app.stock;
  const uid = useId().replace(/:/g, "");
  const receive = useReceiveStock(row?.productId ?? "");
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const close = () => { setQty(""); setCost(""); setNote(""); setError(""); onClose(); };
  const q = toNum(qty), c = toNum(cost);
  const preview = row && Number.isInteger(q) && q > 0 && c >= 0 ? (row.onHand > 0 && row.avgCost != null ? (row.onHand * row.avgCost + q * c) / (row.onHand + q) : c) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isInteger(q) || q < 1 || !(c >= 0)) { setError(m.errors.invalid_body); return; }
    setError("");
    receive.mutate({ qty: q, unitCost: c, note: note.trim() || null }, { onSuccess: close, onError: (err) => setError(errText(m, err)) });
  }
  return (
    <Dialog open={row !== null} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{m.receiveTitle}</DialogTitle>
          <DialogDescription>{row?.name}</DialogDescription>
        </DialogHeader>
        <form className="uform uform--modal" onSubmit={submit}>
          <div className="field"><label htmlFor={`${uid}q`}>{m.qty}</label><Input id={`${uid}q`} type="number" inputMode="numeric" min={1} step={1} value={qty} onChange={(e) => setQty(e.target.value)} required /></div>
          <div className="field"><label htmlFor={`${uid}c`}>{m.unitCost}</label><MoneyInput id={`${uid}c`} value={cost} onValueChange={setCost} required /><span className="uform__hint">{m.unitCostHint}</span></div>
          <div className="field"><label htmlFor={`${uid}n`}>{m.receiveNote}</label><Input id={`${uid}n`} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={m.receiveNotePh} autoComplete="off" /></div>
          {preview != null && row && <p role="status" className="case__saving">{fill(m.preview, { onHand: num(lang, row.onHand + q), cost: money(lang, preview, "COP") })}</p>}
          <p className="field-error" role="alert" hidden={!error}>{error}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>{m.cancel}</Button>
            <Button type="submit" disabled={receive.isPending}>{receive.isPending ? m.saving : m.receiveSubmit}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdjustDialog({ row, onClose, t }: { row: StockRow | null; onClose: () => void; t: Dict }) {
  const m = t.app.stock;
  const uid = useId().replace(/:/g, "");
  const adjust = useAdjustStock(row?.productId ?? "");
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const close = () => { setCounted(""); setNote(""); setError(""); onClose(); };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = toNum(counted);
    if (!Number.isInteger(n) || n < 0 || note.trim().length < 3) { setError(m.errors.invalid_body); return; }
    setError("");
    adjust.mutate({ counted: n, note: note.trim() }, { onSuccess: close, onError: (err) => setError(errText(m, err)) });
  }
  return (
    <Dialog open={row !== null} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{m.adjustTitle}</DialogTitle>
          <DialogDescription>{row ? fill(m.adjustSub, { name: row.name, n: row.onHand }) : ""}</DialogDescription>
        </DialogHeader>
        <form className="uform uform--modal" onSubmit={submit}>
          <div className="field"><label htmlFor={`${uid}c`}>{m.counted}</label><Input id={`${uid}c`} type="number" inputMode="numeric" min={0} step={1} value={counted} onChange={(e) => setCounted(e.target.value)} required /></div>
          <div className="field"><label htmlFor={`${uid}n`}>{m.reason}</label><Input id={`${uid}n`} value={note} minLength={3} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={m.reasonPh} autoComplete="off" required /></div>
          <p className="field-error" role="alert" hidden={!error}>{error}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>{m.cancel}</Button>
            <Button type="submit" disabled={adjust.isPending}>{adjust.isPending ? m.saving : m.adjustSubmit}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ row, onClose, t, lang }: { row: StockRow | null; onClose: () => void; t: Dict; lang: Locale }) {
  const m = t.app.stock;
  const moves = useStockMoves(row?.productId ?? null);
  const dt = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" });
  return (
    <Dialog open={row !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{m.historyTitle}</DialogTitle>
          <DialogDescription>{row?.name}</DialogDescription>
        </DialogHeader>
        {moves.isPending ? <Loading label={m.loading} variant="detail" /> : moves.isError ? <p role="alert">{m.loadError}</p> : (
          <ul className="stockmoves">
            {moves.data.map((x) => (
              <li key={x.id}>
                <div>
                  <strong>{m.moves[x.kind]}</strong>{" "}
                  <span className={x.qty < 0 ? "stockmoves__out" : "stockmoves__in"}>{x.qty > 0 ? "+" : ""}{num(lang, x.qty)}</span>
                  {" · "}{fill(m.balance, { n: num(lang, x.balance) })}
                  {x.unitCost != null && <> · {money(lang, x.unitCost, "COP")}</>}
                </div>
                <small>
                  {dt.format(new Date(x.createdAt))} · {x.userName}
                  {x.project && <> · {x.project.name ?? x.project.id}{x.project.client ? ` (${x.project.client})` : ""}</>}
                  {x.note && <> · {x.note === "initial" ? m.moves.initial : x.note}</>}
                </small>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>{m.close}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

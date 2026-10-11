"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/Loading";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ManualForm } from "@/components/ProductEditor";
import { EmptyState } from "@/components/EmptyState";
import { Package } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useManufacturers } from "@/hooks/useManufacturers";
import { useProductList } from "@/hooks/useProducts";
import { useCommission, useSetCommission, useSync } from "@/hooks/useCatalogAdmin";
import { fill, money } from "@/lib/format";

const ALL = "all"; // Radix no admite value="" en un ítem

export function ProductsList({ t, lang, isAdmin }: { t: Dict; lang: Locale; isAdmin: boolean }) {
  const p = t.app.products;
  const uid = useId().replace(/:/g, "");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [manufacturerId, setManufacturerId] = useState(ALL);
  const [source, setSource] = useState(ALL);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  // Busca 300 ms después de dejar de escribir.
  useEffect(() => {
    const id = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(id);
  }, [qInput]);

  const makers = useManufacturers();
  const list = useProductList({ q, manufacturerId: manufacturerId === ALL ? "" : manufacturerId, source: source === ALL ? "" : source, page });
  const commission = useCommission();
  const globalPct = commission.data?.commissionPct ?? 0;
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <div className="pb">
      <header className="ph">
        <div>
          <h1 className="ph__title">{p.title}</h1>
          <p className="ph__sub">{p.sub}</p>
        </div>
        <div className="ph__tools">
          <Button type="button" size="sm" aria-haspopup="dialog" onClick={() => setCreating(true)}>{p.add}</Button>
        </div>
      </header>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t.app.product.newTitle}</DialogTitle>
            <DialogDescription>{p.sub}</DialogDescription>
          </DialogHeader>
          <ManualForm t={t} lang={lang} isAdmin={isAdmin} embedded onCreated={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      {isAdmin && <AdminPanel t={t} />}

      <div className="ph__tools ptools">
        <div className="field field--inline">
          <label htmlFor={`${uid}q`} className="sr-only">{p.search}</label>
          <Input id={`${uid}q`} type="search" placeholder={p.search} value={qInput} onChange={(e) => setQInput(e.target.value)} />
        </div>
        <div className="field field--inline">
          <label htmlFor={`${uid}m`} className="sr-only">{p.maker}</label>
          <Select value={manufacturerId} onValueChange={(v) => { setManufacturerId(v); setPage(1); }}>
            <SelectTrigger id={`${uid}m`}><SelectValue>{manufacturerId === ALL ? p.allMakers : makers.data?.find((m) => m.id === manufacturerId)?.name}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{p.allMakers}</SelectItem>
              {makers.data?.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="field field--inline">
          <label htmlFor={`${uid}s`} className="sr-only">{p.allSources}</label>
          <Select value={source} onValueChange={(v) => { setSource(v); setPage(1); }}>
            <SelectTrigger id={`${uid}s`}>
              <SelectValue>{source === ALL ? p.allSources : source === "manual" ? p.sourceManual : p.sourceAutosolar}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{p.allSources}</SelectItem>
              <SelectItem value="manual">{p.sourceManual}</SelectItem>
              <SelectItem value="autosolar">{p.sourceAutosolar}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {list.isPending ? (
        <Loading label={p.loading} variant="table" cols={6} rows={8} />
      ) : list.isError ? (
        <p role="alert">{p.loadError} <Button type="button" variant="outline" size="sm" onClick={() => list.refetch()}>{p.retry}</Button></p>
      ) : list.data.items.length === 0 ? (
        <EmptyState icon={Package} title={t.app.empty.products.title} description={t.app.empty.products.desc} />
      ) : (
        <>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">{p.name}</th>
                  <th scope="col">{p.maker}</th>
                  <th scope="col" className="num">{p.cost}</th>
                  <th scope="col" className="num">{p.commission}</th>
                  <th scope="col" className="num">{p.price}</th>
                  <th scope="col">{p.status}</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((it) => (
                  <tr key={it.id}>
                    <th scope="row">
                      <Link href={`/${lang}/app/products/${it.id}`}>{it.name}</Link>
                      {it.category && <span className="tbl__sub">{it.category}</span>}
                    </th>
                    <td>{it.manufacturer.name}</td>
                    <td className="num">{it.supplierPrice == null ? "—" : money(lang, it.supplierPrice, it.currency)}</td>
                    <td className="num">{it.supplierPrice == null ? "—" : `${it.commissionPct ?? globalPct} %`}</td>
                    <td className="num"><strong>{money(lang, it.price, it.currency)}</strong></td>
                    <td>
                      <span className="badges">
                        <Badge variant={it.source === "manual" ? "secondary" : "default"}>{it.source === "manual" ? p.sourceManual : p.sourceAutosolar}</Badge>
                        {!it.inStock && <Badge variant="warning">{p.outOfStock}</Badge>}
                        {!it.active && <Badge variant="outline">{p.hidden}</Badge>}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="pager" aria-label={p.title}>
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>{p.prev}</Button>
            <span role="status">{fill(p.pageOf, { page, pages, total: list.data.total })}</span>
            <Button type="button" variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((n) => n + 1)}>{p.next}</Button>
          </nav>
        </>
      )}
    </div>
  );
}

/** Solo administradores: comisión global y sincronización con Autosolar. */
function AdminPanel({ t }: { t: Dict }) {
  const p = t.app.products;
  const uid = useId().replace(/:/g, "");
  const commission = useCommission();
  const setCommission = useSetCommission();
  const sync = useSync();
  const [value, setValue] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const shown = value ?? String(commission.data?.commissionPct ?? "");

  function save(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(shown.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return;
    setMsg("");
    setCommission.mutate(n, {
      onSuccess: (r) => { setValue(null); setMsg(fill(p.saved, { n: r.repriced })); },
      onError: () => setMsg(p.saveError),
    });
  }

  return (
    <section className="apanel" aria-label={p.globalCommission}>
      <form onSubmit={save} className="apanel__commission">
        <div className="field">
          <label htmlFor={`${uid}c`}>{p.globalCommission}</label>
          <Input id={`${uid}c`} type="number" inputMode="decimal" min={0} max={1000} step="0.01" value={shown} onChange={(e) => setValue(e.target.value)} aria-describedby={`${uid}h`} />
        </div>
        <Button type="submit" size="sm" disabled={setCommission.isPending || commission.isPending}>{setCommission.isPending ? p.saving : p.save}</Button>
        <p id={`${uid}h`} className="apanel__hint">{p.globalHint}</p>
      </form>

      <div className="apanel__sync">
        <Button type="button" variant="outline" size="sm" onClick={sync.start} disabled={sync.running}>
          {sync.running ? fill(p.syncing, { done: sync.step?.cursor ?? 0, total: sync.step?.total ?? "…" }) : p.sync}
        </Button>
        {sync.step?.done && !sync.running && (
          <p role="status">{fill(p.syncDone, { created: sync.step.created, updated: sync.step.updated, failed: sync.step.failed })}</p>
        )}
        {sync.error && <p role="alert" className="field-error">{p.syncError}</p>}
      </div>
      <p role="status" className="sr-only">{msg}</p>
      {msg && <p className="apanel__msg" aria-hidden="true">{msg}</p>}
    </section>
  );
}

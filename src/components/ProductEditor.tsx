"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { ProductDetail } from "@/lib/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useManufacturers } from "@/hooks/useManufacturers";
import { useCommission } from "@/hooks/useCatalogAdmin";
import { useCreateProduct, useDeleteProduct, useProduct, useUpdateProduct, type ProductInput } from "@/hooks/useProducts";
import { fill, money } from "@/lib/format";
import { effectiveCommission, salePrice } from "@/lib/pricing";

type Props = { t: Dict; lang: Locale; isAdmin: boolean; id?: string };

export function ProductEditor({ id, ...rest }: Props) {
  const { t, lang } = rest;
  const p = t.app.product;
  const back = <Link href={`/${lang}/app/products`} className="back">← {p.back}</Link>;
  const detail = useProduct(id ?? "");

  if (!id) return <div className="pb">{back}<ManualForm {...rest} /></div>;
  if (detail.isPending) return <div className="pb">{back}<p role="status">{p.loading}</p></div>;
  if (detail.isError || !detail.data) return <div className="pb">{back}<p role="alert">{p.notFound}</p></div>;
  return (
    <div className="pb">
      {back}
      {detail.data.source === "manual" ? <ManualForm {...rest} product={detail.data} /> : <ImportedPanel {...rest} product={detail.data} />}
    </div>
  );
}

/** Alta/edición de un producto manual. `embedded`: dentro de un modal (sin título de página). */
export function ManualForm({ t, lang, isAdmin, product, embedded, onCreated }: Props & { product?: ProductDetail; embedded?: boolean; onCreated?: () => void }) {
  const p = t.app.product;
  const uid = useId().replace(/:/g, "");
  const router = useRouter();
  const makers = useManufacturers();
  const create = useCreateProduct();
  const update = useUpdateProduct(product?.id ?? "");
  const remove = useDeleteProduct();
  const [makerId, setMakerId] = useState(product?.manufacturer.id ?? "");
  const [specs, setSpecs] = useState(product?.specs ?? []);
  const [active, setActive] = useState(product?.active ?? true);
  const [inStock, setInStock] = useState(product?.inStock ?? true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const busy = create.isPending || update.isPending;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const blank = (k: string) => String(f.get(k) ?? "").trim() || null;
    const input: ProductInput = {
      name: String(f.get("name")).trim(),
      manufacturerId: makerId,
      price: Number(String(f.get("price")).replace(",", ".")),
      description: blank("description"),
      category: blank("category"),
      sku: blank("sku"),
      datasheetUrl: blank("datasheetUrl"),
      specs: specs.map((s) => ({ label: s.label.trim(), value: s.value.trim() })).filter((s) => s.label && s.value),
      active,
      inStock,
    };
    setMsg("");
    setError("");
    if (product) {
      update.mutate(input, { onSuccess: () => setMsg(p.saved), onError: () => setError(p.saveError) });
    } else {
      create.mutate(input, { onSuccess: (c) => { onCreated?.(); router.push(`/${lang}/app/products/${c.id}`); }, onError: () => setError(p.saveError) });
    }
  }

  function onDelete() {
    if (!product || !window.confirm(p.confirmDelete)) return;
    remove.mutate(product.id, { onSuccess: () => router.replace(`/${lang}/app/products`), onError: () => setError(p.saveError) });
  }

  return (
    <>
      {!embedded && <header className="ph"><h1 className="ph__title">{product ? product.name : p.newTitle}</h1></header>}
      <form className={`pform ${embedded ? "pform--modal" : ""}`} onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor={`${uid}n`}>{p.name}</label>
          <Input id={`${uid}n`} name="name" defaultValue={product?.name} required maxLength={200} />
        </div>
        <div className="field">
          <label htmlFor={`${uid}m`}>{p.maker}</label>
          <Select value={makerId} onValueChange={setMakerId} required>
            <SelectTrigger id={`${uid}m`}><SelectValue placeholder={p.selectMaker}>{makers.data?.find((m) => m.id === makerId)?.name}</SelectValue></SelectTrigger>
            <SelectContent>{makers.data?.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
          {makers.data?.length === 0 && <span className="pform__hint">{p.noMakers} <Link href={`/${lang}/app/manufacturers`}>{t.app.nav.makers}</Link></span>}
        </div>
        <div className="field">
          <label htmlFor={`${uid}p`}>{p.price}</label>
          <Input id={`${uid}p`} name="price" type="number" inputMode="decimal" min={0} step="1" defaultValue={product?.price} required />
        </div>
        <div className="field">
          <label htmlFor={`${uid}c`}>{p.category}</label>
          <Input id={`${uid}c`} name="category" defaultValue={product?.category ?? ""} maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor={`${uid}s`}>{p.sku}</label>
          <Input id={`${uid}s`} name="sku" defaultValue={product?.sku ?? ""} maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor={`${uid}d`}>{p.datasheet}</label>
          <Input id={`${uid}d`} name="datasheetUrl" type="url" defaultValue={product?.datasheetUrl ?? ""} />
        </div>
        <div className="field pform__full">
          <label htmlFor={`${uid}x`}>{p.description}</label>
          <Textarea id={`${uid}x`} name="description" defaultValue={product?.description ?? ""} rows={5} maxLength={20000} />
        </div>

        <fieldset className="pform__full specs">
          <legend>{p.specs}</legend>
          {specs.map((s, i) => (
            <div className="specs__row" key={i}>
              <Input aria-label={p.specLabel} placeholder={p.specLabel} value={s.label} onChange={(e) => setSpecs((cur) => cur.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <Input aria-label={p.specValue} placeholder={p.specValue} value={s.value} onChange={(e) => setSpecs((cur) => cur.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
              <Button type="button" variant="outline" size="sm" aria-label={`${p.removeSpec}: ${s.label}`} onClick={() => setSpecs((cur) => cur.filter((_, j) => j !== i))}>×</Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setSpecs((cur) => [...cur, { label: "", value: "" }])}>{p.addSpec}</Button>
        </fieldset>

        <div className="pform__full pform__checks">
          <label><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> {p.active}</label>
          <label><input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} /> {p.inStock}</label>
        </div>

        <p className="field-error pform__full" role="alert" hidden={!error}>{error}</p>
        <p className="pform__ok pform__full" role="status">{msg}</p>
        <div className="pform__actions pform__full">
          <Button type="submit" disabled={busy || !makerId}>{busy ? p.saving : product ? p.save : p.create}</Button>
          {product && isAdmin && <Button type="button" variant="destructive" onClick={onDelete} disabled={remove.isPending}>{p.delete}</Button>}
        </div>
      </form>
    </>
  );
}

function ImportedPanel({ t, lang, isAdmin, product }: Props & { product: ProductDetail }) {
  const p = t.app.product;
  const router = useRouter();
  const uid = useId().replace(/:/g, "");
  const global = useCommission().data?.commissionPct ?? 0;
  const update = useUpdateProduct(product.id);
  const remove = useDeleteProduct();
  const [own, setOwn] = useState(product.commissionPct == null ? "" : String(product.commissionPct));
  const [active, setActive] = useState(product.active);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const ownNum = own.trim() === "" ? null : Number(own.replace(",", "."));
  const invalid = ownNum !== null && (!Number.isFinite(ownNum) || ownNum < 0);
  const preview = product.supplierPrice == null || invalid ? product.price : salePrice(product.supplierPrice, effectiveCommission(ownNum, global));

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (invalid) return;
    setMsg("");
    setError("");
    update.mutate({ commissionPct: ownNum, active }, { onSuccess: () => setMsg(p.saved), onError: () => setError(p.saveError) });
  }

  function onDelete() {
    if (!window.confirm(p.confirmDelete)) return;
    remove.mutate(product.id, { onSuccess: () => router.replace(`/${lang}/app/products`), onError: () => setError(p.saveError) });
  }

  return (
    <>
      <header className="ph">
        <div>
          <h1 className="ph__title">{product.name}</h1>
          <p className="ph__sub">
            {product.manufacturer.name}{product.category && ` · ${product.category}`}{" "}
            <Badge>{t.app.products.sourceAutosolar}</Badge> {!product.inStock && <Badge variant="warning">{t.app.products.outOfStock}</Badge>}
          </p>
        </div>
      </header>
      <p className="pform__note">{p.importedNote}</p>

      <div className="two two--wide">
        <section className="panel">
          <dl className="pfacts">
            <div><dt>{p.supplierPrice}</dt><dd>{product.supplierPrice == null ? "—" : money(lang, product.supplierPrice, product.currency)}</dd></div>
            <div><dt>{p.finalPrice}</dt><dd><strong>{money(lang, preview, product.currency)}</strong></dd></div>
            {product.sku && <div><dt>{p.sku}</dt><dd>{product.sku}</dd></div>}
            {product.lastSyncedAt && <div><dt>{p.lastSynced}</dt><dd>{new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(new Date(product.lastSyncedAt))}</dd></div>}
          </dl>

          <form onSubmit={onSave} className="pform pform--single">
            <div className="field">
              <label htmlFor={`${uid}o`}>{p.ownCommission}</label>
              <Input id={`${uid}o`} type="number" inputMode="decimal" min={0} max={1000} step="0.01" value={own} onChange={(e) => setOwn(e.target.value)} aria-describedby={`${uid}h`} aria-invalid={invalid} />
              <span id={`${uid}h`} className="pform__hint">{fill(p.ownCommissionHint, { pct: global })}</span>
            </div>
            <div className="pform__checks"><label><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> {p.active}</label></div>
            <p className="field-error" role="alert" hidden={!error}>{error}</p>
            <p className="pform__ok" role="status">{msg}</p>
            <div className="pform__actions">
              <Button type="submit" disabled={update.isPending || invalid}>{update.isPending ? p.saving : p.save}</Button>
              {product.sourceUrl && <Button asChild variant="outline"><a href={product.sourceUrl} target="_blank" rel="noopener noreferrer">{p.viewSource}</a></Button>}
              {isAdmin && <Button type="button" variant="destructive" onClick={onDelete} disabled={remove.isPending}>{p.delete}</Button>}
            </div>
          </form>
        </section>

        <section className="panel">
          {product.images.length > 0 && (
            <div className="pimgs" aria-label={p.images}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {product.images.map((im) => <img key={im.src} src={im.url} alt="" loading="lazy" />)}
            </div>
          )}
          {product.description && <p className="pdesc">{product.description}</p>}
          {product.specs.length > 0 && (
            <>
              <h2 className="panel__title">{p.specs}</h2>
              <dl className="pspecs">{product.specs.map((s) => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}</dl>
            </>
          )}
          {product.datasheetUrl && <p><a href={product.datasheetUrl} target="_blank" rel="noopener noreferrer">{p.datasheet}</a></p>}
        </section>
      </div>
    </>
  );
}

"use client";

import { useId, useState } from "react";
import type { Dict } from "@/i18n";
import { EmptyState } from "@/components/EmptyState";
import { Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/Loading";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateManufacturer, useDeleteManufacturer, useManufacturers } from "@/hooks/useManufacturers";
import { useConfirm } from "@/components/ConfirmProvider";

export function ManufacturersManager({ t, isAdmin }: { t: Dict; isAdmin: boolean }) {
  const m = t.app.makers;
  const uid = useId().replace(/:/g, "");
  const { data, isPending, isError, refetch } = useManufacturers();
  const create = useCreateManufacturer();
  const remove = useDeleteManufacturer();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setError("");
    create.mutate(
      { name: String(f.get("name")).trim(), website: String(f.get("website") ?? "").trim() || null },
      {
        onSuccess: () => { form.reset(); setOpen(false); },
        onError: (err) => setError((err as { status?: number }).status === 409 ? m.exists : m.actionError),
      },
    );
  }

  async function onDelete(id: string, name: string) {
    if (!(await confirm({ message: m.confirmDelete, subject: name, confirmLabel: m.delete }))) return;
    setMsg("");
    remove.mutate(id, { onError: (err) => setMsg((err as { status?: number }).status === 409 ? m.blocked : m.actionError) });
  }

  return (
    <div className="pb">
      <header className="ph">
        <div>
          <h1 className="ph__title">{m.title}</h1>
          <p className="ph__sub">{m.sub}</p>
        </div>
        <div className="ph__tools">
          <Button type="button" size="sm" aria-haspopup="dialog" onClick={() => { setError(""); setOpen(true); }}>{m.add}</Button>
        </div>
      </header>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{m.add}</DialogTitle>
            <DialogDescription>{m.sub}</DialogDescription>
          </DialogHeader>
          <form className="uform uform--modal" onSubmit={onCreate}>
            <div className="field">
              <label htmlFor={`${uid}n`}>{m.name}</label>
              <Input id={`${uid}n`} name="name" required maxLength={120} autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor={`${uid}w`}>{m.website}</label>
              <Input id={`${uid}w`} name="website" type="url" placeholder="https://" autoComplete="off" />
            </div>
            <p className="field-error" role="alert" hidden={!error}>{error}</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{m.cancel}</Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? m.creating : m.create}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <p role="status" className={msg ? "field-error" : "sr-only"}>{msg}</p>

      {isPending ? (
        <Loading label={m.loading} variant="table" cols={4} />
      ) : isError ? (
        <p role="alert">{m.loadError} <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>{m.retry}</Button></p>
      ) : data.length === 0 ? (
        <EmptyState icon={Factory} title={t.app.empty.makers.title} description={t.app.empty.makers.desc}>
          <Button type="button" onClick={() => { setError(""); setOpen(true); }}>{t.app.empty.makers.action}</Button>
        </EmptyState>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">{m.name}</th>
                <th scope="col">{m.website}</th>
                <th scope="col" className="num">{m.products}</th>
                {isAdmin && <th scope="col">{m.actions}</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((x) => (
                <tr key={x.id}>
                  <th scope="row">{x.name}</th>
                  <td>{x.website ? <a href={x.website} target="_blank" rel="noopener noreferrer">{new URL(x.website).host}</a> : "—"}</td>
                  <td className="num">{x.productCount}</td>
                  {isAdmin && (
                    <td>
                      <Button type="button" variant="outline" size="sm" aria-label={`${m.delete}: ${x.name}`} disabled={x.productCount > 0 || remove.isPending} title={x.productCount > 0 ? m.blocked : undefined} onClick={() => onDelete(x.id, x.name)}>
                        {m.delete}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useId, useState } from "react";
import { Download, Eye, EyeOff, FileText } from "lucide-react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fill } from "@/lib/format";
import { DOC_KINDS, DOC_MAX_BYTES } from "@/lib/documents";
import { type ProjectDoc, useDeleteDocument, useDocuments, usePatchDocument, useUploadDocument } from "@/hooks/useProject";
import { useConfirm } from "@/components/ConfirmProvider";
import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Loading";
import { useCan } from "@/components/RoleContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const size = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);

/** Pestaña «Documentos»: planos, permisos y certificados del proyecto. Gestión los sube; el cliente solo ve los que se marcan como visibles. */
export function ProjectDocuments({ t, lang, projectId, hasPortal }: { t: Dict; lang: Locale; projectId: string; hasPortal: boolean }) {
  const d = t.app.detail.docs;
  const uid = useId().replace(/:/g, "");
  const manage = useCan("projects.manage");
  const { data, isPending, isError } = useDocuments(projectId);
  const upload = useUploadDocument(projectId);
  const patch = usePatchDocument(projectId);
  const del = useDeleteDocument(projectId);
  const confirm = useConfirm();
  const [kind, setKind] = useState<ProjectDoc["kind"]>("plan");
  const [title, setTitle] = useState("");
  const [visible, setVisible] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [inputKey, setInputKey] = useState(0);
  const dt = new Intl.DateTimeFormat(lang, { dateStyle: "medium" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    if (file.size > DOC_MAX_BYTES) { setError(d.errors.too_large); return; }
    upload.mutate({ file, kind, title: title.trim() || file.name.replace(/\.[^.]+$/, ""), visibleToClient: visible }, {
      onSuccess: () => { setFile(null); setTitle(""); setVisible(false); setInputKey((k) => k + 1); },
      onError: (err) => setError(d.errors[({ 413: "too_large", 415: "unsupported_type", 409: "too_many" } as Record<number, keyof typeof d.errors>)[(err as { status?: number }).status ?? 0] ?? "generic"]),
    });
  }

  if (isPending) return <Loading label={d.title} variant="detail" />;
  if (isError || !data) return <p role="alert">{d.loadError}</p>;
  return (
    <div className="pb">
      <section className="panel" aria-labelledby={`${uid}h`}>
        <h2 id={`${uid}h`} className="panel__title">{d.title}</h2>
        <p className="wiz__hint">{hasPortal ? d.hint : d.hintNoPortal}</p>
        {data.length === 0 ? (
          <EmptyState icon={FileText} title={d.empty.title} description={d.empty.desc} />
        ) : (
          <ul className="pdocs">
            {data.map((x) => (
              <li key={x.id} className="pdocs__row">
                <div className="pdocs__main">
                  <strong>{x.title}</strong>
                  <small>{d.kinds[x.kind]} · {size(x.size)} · {fill(d.by, { who: x.uploadedBy, date: dt.format(new Date(x.createdAt)) })}</small>
                  {hasPortal && <Badge variant={x.visibleToClient ? "default" : "warning"}>{x.visibleToClient ? d.sharedBadge : d.privateBadge}</Badge>}
                </div>
                <div className="flow__actions">
                  <Button asChild variant="outline" size="sm"><a href={`/api/projects/${projectId}/documents/${x.id}`}><Download aria-hidden="true" />{d.download}</a></Button>
                  {manage && hasPortal && (
                    <Button type="button" variant="outline" size="sm" disabled={patch.isPending} onClick={() => patch.mutate({ did: x.id, visibleToClient: !x.visibleToClient })}>
                      {x.visibleToClient ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}{x.visibleToClient ? d.hide : d.share}
                    </Button>
                  )}
                  {manage && (
                    <Button type="button" variant="outline" size="sm" disabled={del.isPending} onClick={async () => { if (await confirm({ message: d.confirmDelete, subject: x.title, confirmLabel: d.remove })) del.mutate(x.id); }}>{d.remove}</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {manage && (
        <section className="panel" aria-labelledby={`${uid}u`}>
          <h2 id={`${uid}u`} className="panel__title">{d.add}</h2>
          <form className="uform" onSubmit={submit}>
            <div className="field">
              <label htmlFor={`${uid}f`}>{d.file}</label>
              <Input key={inputKey} id={`${uid}f`} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <span className="uform__hint">{d.fileHint}</span>
            </div>
            <div className="field">
              <label htmlFor={`${uid}k`}>{d.kind}</label>
              <Select value={kind} onValueChange={(v) => setKind(v as ProjectDoc["kind"])}>
                <SelectTrigger id={`${uid}k`}><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_KINDS.map((k) => <SelectItem key={k} value={k}>{d.kinds[k]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="field">
              <label htmlFor={`${uid}t`}>{d.name}</label>
              <Input id={`${uid}t`} value={title} maxLength={120} minLength={2} placeholder={d.namePh} autoComplete="off" onChange={(e) => setTitle(e.target.value)} />
            </div>
            {hasPortal && (
              <label className="wiz__consent">
                <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
                <span>{d.visibleLabel}</span>
              </label>
            )}
            {error && <p className="field-error" role="alert">{error}</p>}
            <div className="flow__actions"><Button type="submit" disabled={!file || upload.isPending}>{upload.isPending ? d.uploading : d.upload}</Button></div>
          </form>
        </section>
      )}
    </div>
  );
}

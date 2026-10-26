"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { BillData } from "@/lib/ai/bill";
import { MAX_FILES, MAX_TOTAL_BYTES, prepareFile } from "@/lib/image";
import { Button } from "@/components/ui/button";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

type Props = { t: Dict; lang: Locale; onExtracted: (bill: BillData) => void; onManual: () => void; onAppliances: () => void };

export function BillUpload({ t, lang, onExtracted, onManual, onAppliances }: Props) {
  const u = t.wiz.upload;
  const e = t.wiz.errors;
  const uid = useId().replace(/:/g, "");
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);

  function add(list: FileList | File[]) {
    setError("");
    const next = [...files, ...Array.from(list)];
    if (next.length > MAX_FILES) return setError(e.tooMany);
    setFiles(next);
  }

  async function analyze() {
    setError("");
    setBusy(true);
    try {
      const prepared = await Promise.all(files.map(prepareFile));
      if (prepared.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_BYTES) return setError(e.tooLarge);
      const body = new FormData();
      for (const f of prepared) body.append("files", f);
      const res = await fetch("/api/simulator/extract", { method: "POST", body });
      if (res.ok) return onExtracted(((await res.json()) as { bill: BillData }).bill);
      const code = ((await res.json().catch(() => ({}))) as { error?: string }).error;
      setError(
        { unsupported_type: e.unsupported, too_large: e.tooLarge, too_many_files: e.tooMany, rate_limited: e.rateLimited, busy: e.busy, not_a_bill: e.notBill, unreadable: e.unreadable, ai_unavailable: e.unavailable }[code ?? ""] ?? e.generic,
      );
    } catch {
      setError(e.generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wiz__upload">
      <div
        className={`wiz__drop ${over ? "is-over" : ""}`}
        onDragOver={(ev) => { ev.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(ev) => { ev.preventDefault(); setOver(false); if (ev.dataTransfer.files.length) add(ev.dataTransfer.files); }}
      >
        <p className="wiz__droptext" id={`${uid}d`}>{u.drop}</p>
        <p className="wiz__hint" id={`${uid}h`}>{u.hint}</p>
        <input ref={input} id={`${uid}f`} className="sr-only" type="file" multiple accept={ACCEPT} aria-label={u.label} aria-describedby={`${uid}d ${uid}h`} onChange={(ev) => { if (ev.target.files) add(ev.target.files); ev.target.value = ""; }} />
        <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={busy}>{u.choose}</Button>
      </div>

      {files.length > 0 && (
        <ul className="wiz__files" aria-label={u.label}>
          {files.map((f, i) => (
            <li key={`${f.name}${i}`}>
              <span>{f.name}</span>
              <button type="button" className="wiz__link" disabled={busy} aria-label={`${u.remove}: ${f.name}`} onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}>{u.remove}</button>
            </li>
          ))}
        </ul>
      )}

      <p className="field-error" role="alert" hidden={!error}>{error}</p>
      <p className="wiz__status" role="status">{busy ? u.reading : ""}</p>

      <div className="wiz__actions">
        <Button type="button" onClick={analyze} disabled={busy || files.length === 0}>{busy ? u.reading : u.analyze}</Button>
        <button type="button" className="wiz__link" onClick={onManual} disabled={busy}>{u.manual}</button>
        <button type="button" className="wiz__link" onClick={onAppliances} disabled={busy}>{u.appliances}</button>
      </div>
      <p className="wiz__privacy">{u.privacy} <Link href={`/${lang}/privacy`} target="_blank" rel="noopener">{u.privacyLink}</Link>.</p>
    </div>
  );
}

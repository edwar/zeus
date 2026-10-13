"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, CloudOff, RefreshCw } from "lucide-react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fill } from "@/lib/format";
import { prepareFile } from "@/lib/image";
import { checklistComplete } from "@/lib/field-checklist";
import { applyAll, checklistProgress, enqueue, type FieldProject, type Op } from "@/lib/field-sync";
import { clearFieldData, dropOps, dropPhoto, getOutbox, getPhotos, getSnapshot, pushOp, putPhoto, setSnapshot, type PendingPhoto, type Snapshot } from "@/lib/field-db";
import { SignaturePad, type SignatureHandle } from "@/components/SignaturePad";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const PERMANENT = new Set(["checklist_incomplete", "already_signed", "not_found", "unknown_check", "no_checklist"]);
const uid = () => crypto.randomUUID().replace(/-/g, "");
const nowIso = () => new Date().toISOString();

type Failure = { key: string; error: string };

/**
 * Modo campo: el equipo marca el checklist, anota, toma fotos y recoge la firma del cliente aunque no haya señal. Todo se
 * guarda primero en el teléfono (IndexedDB) y se envía en cuanto hay conexión; la pantalla responde al instante porque aplica
 * lo pendiente sobre la última copia que bajó del servidor.
 */
export function FieldApp({ t, lang, userId, userName }: { t: Dict; lang: Locale; userId: string; userName: string }) {
  const f = t.app.fieldMode;
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [outbox, setOutbox] = useState<Op[]>([]);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const busy = useRef(false);
  const again = useRef(false); // llegó algo nuevo mientras se enviaba: se vuelve a enviar al terminar

  const projects = useMemo(() => (snap ? applyAll(snap.projects, outbox, userName) : []), [snap, outbox, userName]);
  const pending = outbox.length + photos.length;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/field/projects?lang=${lang}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { userId: string; fetchedAt: string; projects: FieldProject[] };
      const next: Snapshot = { userId: data.userId, fetchedAt: data.fetchedAt, projects: data.projects };
      await setSnapshot(next);
      setSnap(next);
      setLoadFailed(false);
      return true;
    } catch {
      return false;
    }
  }, [lang]);

  const sync = useCallback(async () => {
    if (!navigator.onLine) return;
    if (busy.current) { again.current = true; return; }
    busy.current = true;
    setSyncing(true);
    try {
      const ops = await getOutbox();
      if (ops.length) {
        const res = await fetch("/api/field/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ops }) });
        if (res.ok) {
          const { results } = (await res.json()) as { results: { id: string; ok: boolean; error?: string }[] };
          // Lo que salió bien o falló para siempre (el servidor lo rechazó) sale de la cola; un error del servidor se reintenta.
          const done = results.filter((r) => r.ok || (r.error && PERMANENT.has(r.error)));
          await dropOps(done.map((r) => r.id));
          const bad = results.filter((r) => !r.ok && r.error && PERMANENT.has(r.error));
          if (bad.length) setFailures((fs) => [...fs, ...bad.map((b) => ({ key: b.id, error: b.error! }))]);
        }
      }
      for (const p of await getPhotos()) {
        const form = new FormData();
        form.set("file", p.blob, `${p.id}.jpg`);
        form.set("id", p.id);
        form.set("projectId", p.projectId);
        form.set("takenAt", p.takenAt);
        if (p.checkKey) form.set("checkKey", p.checkKey);
        const res = await fetch("/api/field/photos", { method: "POST", body: form });
        if (res.ok) await dropPhoto(p.id);
        else if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
          const code = ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "generic";
          await dropPhoto(p.id);
          setFailures((fs) => [...fs, { key: p.id, error: code }]);
        } else break; // sin señal o el servidor tropezó: se reintenta luego
      }
      setOutbox(await getOutbox());
      setPhotos(await getPhotos());
      await refresh();
    } catch {
      /* sin señal: queda en la cola */
    } finally {
      busy.current = false;
      setSyncing(false);
      if (again.current) { again.current = false; void sync(); }
    }
  }, [refresh]);

  // Arranque: primero lo que hay en el teléfono (para abrir sin señal), luego la red.
  useEffect(() => {
    let alive = true;
    (async () => {
      let cached = await getSnapshot().catch(() => undefined);
      // Otra persona usó este teléfono antes: no se le muestran los proyectos de la anterior.
      if (cached && cached.userId !== userId) { await clearFieldData(); cached = undefined; }
      if (!alive) return;
      setSnap(cached ?? null);
      setOutbox(await getOutbox().catch(() => []));
      setPhotos(await getPhotos().catch(() => []));
      setOnline(navigator.onLine);
      setReady(true);
      const url = new URL(window.location.href).searchParams.get("p");
      if (url) setOpen(url);
      if (navigator.onLine) {
        const ok = await refresh();
        if (!ok && !cached) setLoadFailed(true);
        await sync();
      } else if (!cached) setLoadFailed(true);
    })();
    const on = () => { setOnline(true); void sync(); };
    const off = () => setOnline(false);
    const pop = () => setOpen(new URL(window.location.href).searchParams.get("p"));
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("popstate", pop);
    return () => { alive = false; window.removeEventListener("online", on); window.removeEventListener("offline", off); window.removeEventListener("popstate", pop); };
  }, [refresh, sync, userId]);

  // Reintento cada medio minuto mientras haya algo sin enviar y haya conexión.
  useEffect(() => {
    if (!pending || !online) return;
    const id = setInterval(() => void sync(), 30_000);
    return () => clearInterval(id);
  }, [pending, online, sync]);

  const go = (id: string | null) => {
    window.history.pushState({}, "", id ? `?p=${id}` : window.location.pathname);
    setOpen(id);
    window.scrollTo(0, 0);
  };

  const act = async (op: Op) => {
    setOutbox((q) => enqueue(q, op)); // la pantalla responde al instante; guardarlo en el teléfono puede tardar unos milisegundos
    await pushOp(op);
    void sync();
  };
  const addPhoto = async (projectId: string, checkKey: string | null, file: File) => {
    const small = await prepareFile(file);
    const rec: PendingPhoto = { id: uid(), projectId, checkKey, takenAt: nowIso(), blob: small, tries: 0 };
    await putPhoto(rec);
    setPhotos(await getPhotos());
    void sync();
  };

  const project = projects.find((p) => p.id === open) ?? null;
  return (
    <div className="pb field">
      <header className="ph">
        <div>
          <h1 className="ph__title">{f.title}</h1>
          <p className="ph__sub">{f.sub}</p>
        </div>
      </header>

      <div className={`field__status${online ? "" : " is-off"}`} role="status">
        <span className="field__dot" aria-hidden="true">{online ? <Check /> : <CloudOff />}</span>
        <span>{online ? f.online : f.offline}</span>
        <strong>{pending > 0 ? fill(f.pending, { n: pending }) : f.allSynced}</strong>
        {snap && online && <small>{fill(f.updated, { time: new Intl.DateTimeFormat(lang, { timeStyle: "short" }).format(new Date(snap.fetchedAt)) })}</small>}
        <Button type="button" variant="outline" size="sm" disabled={!online || syncing || (pending === 0 && !!snap)} onClick={() => void sync()}><RefreshCw aria-hidden="true" />{syncing ? f.syncing : f.syncNow}</Button>
      </div>

      {failures.length > 0 && (
        <div className="field__fail" role="alert">
          <strong>{f.failedTitle}</strong>
          <ul>{failures.map((x) => <li key={x.key}>{f.errors[x.error as keyof typeof f.errors] ?? f.errors.generic}</li>)}</ul>
          <Button type="button" variant="outline" size="sm" onClick={() => setFailures([])}>{f.dismiss}</Button>
        </div>
      )}

      {!ready ? null : loadFailed && !snap ? (
        <p role="alert">{f.loadError} <Button type="button" variant="outline" size="sm" onClick={() => void refresh().then((ok) => setLoadFailed(!ok))}>{f.retry}</Button></p>
      ) : project ? (
        <ProjectField t={t} lang={lang} p={project} online={online} pendingPhotos={photos.filter((x) => x.projectId === project.id)} onBack={() => go(null)} act={act} addPhoto={addPhoto} />
      ) : projects.length === 0 ? (
        <p className="panel__meta">{f.noProjects}</p>
      ) : (
        <ul className="field__list">
          {projects.map((p) => {
            const c = checklistProgress(p.checks);
            const waiting = outbox.filter((o) => o.projectId === p.id).length + photos.filter((x) => x.projectId === p.id).length;
            return (
              <li key={p.id} className="field__card">
                <div>
                  <strong>{p.name}</strong>
                  <small>{p.client} · {p.town} · {p.kwp} kWp</small>
                  <span className="field__tags">
                    <Badge variant="outline">{t.app.stages[p.stage as keyof typeof t.app.stages] ?? p.stage}</Badge>
                    <Badge variant={c.done === c.total && c.total > 0 ? "default" : "warning"}>{fill(f.checklistOf, c)}</Badge>
                    {p.handover && <Badge variant="default">{f.delivered}</Badge>}
                    {waiting > 0 && <Badge variant="secondary">{fill(f.pending, { n: waiting })}</Badge>}
                  </span>
                </div>
                <Button type="button" onClick={() => go(p.id)}>{f.open}</Button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="wiz__hint">{f.installHint}</p>
    </div>
  );
}

function ProjectField({ t, lang, p, online, pendingPhotos, onBack, act, addPhoto }: {
  t: Dict; lang: Locale; p: FieldProject; online: boolean; pendingPhotos: PendingPhoto[]; onBack: () => void; act: (op: Op) => Promise<void>; addPhoto: (projectId: string, checkKey: string | null, f: File) => Promise<void>;
}) {
  const f = t.app.fieldMode;
  const sig = useRef<SignatureHandle>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [sigEmpty, setSigEmpty] = useState(true);
  const c = checklistProgress(p.checks);
  const complete = checklistComplete(p.checks);
  const matReady = p.materials.filter((m) => m.ready).length;
  const label = (k: { labelEs: string; labelEn: string }) => (lang === "en" ? k.labelEn : k.labelEs);
  const photoCount = (key: string) => p.photos.filter((x) => x.checkKey === key).length + pendingPhotos.filter((x) => x.checkKey === key).length;
  const dt = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" });
  const preview = useMemo(() => pendingPhotos.map((x) => ({ id: x.id, url: URL.createObjectURL(x.blob) })), [pendingPhotos]);
  useEffect(() => () => preview.forEach((x) => URL.revokeObjectURL(x.url)), [preview]);

  const onFile = (key: string | null) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await addPhoto(p.id, key, file);
  };

  return (
    <div className="field__project">
      <button type="button" className="back" onClick={onBack}>← {f.back}</button>
      <section className="panel">
        <h2 className="panel__title">{p.name}</h2>
        <p className="panel__meta">{p.client} · {p.town} · {p.kwp} kWp</p>
      </section>

      <section className="panel" aria-labelledby={`chk-${p.id}`}>
        <div className="prog__top"><h2 id={`chk-${p.id}`} className="panel__title">{f.checklist}</h2><strong className="prog__pct">{c.done}/{c.total}</strong></div>
        <p className="wiz__hint">{f.checklistHint}</p>
        <ul className="field__checks">
          {p.checks.map((k) => (
            <CheckRow key={k.key} k={k} label={label(k)} f={f} photos={photoCount(k.key)} disabled={!!p.handover}
              onToggle={(done) => act({ id: uid(), type: "check", projectId: p.id, key: k.key, done, at: nowIso() })}
              onNote={(note) => act({ id: uid(), type: "check", projectId: p.id, key: k.key, done: k.done, note, at: nowIso() })}
              onFile={onFile(k.key)} />
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby={`mat-${p.id}`}>
        <h2 id={`mat-${p.id}`} className="panel__title">{f.materials} <small>{matReady} {f.of} {p.materials.length} {f.ready}</small></h2>
        {p.materials.length === 0 ? <p className="panel__meta">{f.materialsEmpty}</p> : (
          <ul className="field__checks">
            {p.materials.map((m) => (
              <li key={m.id} className="field__check">
                <label className="field__tick"><input type="checkbox" checked={m.ready} onChange={(e) => void act({ id: uid(), type: "material", projectId: p.id, mid: m.id, ready: e.target.checked, at: nowIso() })} /><span>{m.name} <small>× {m.qty}</small></span></label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby={`ms-${p.id}`}>
        <h2 id={`ms-${p.id}`} className="panel__title">{f.milestones}</h2>
        {p.milestones.length === 0 ? <p className="panel__meta">{f.milestonesEmpty}</p> : (
          <ul className="field__ms">
            {p.milestones.map((m) => (
              <li key={m.id}>
                <span>{m.label} <strong>{m.done} %</strong></span>
                <span className="field__pct" role="group" aria-label={m.label}>
                  {[0, 25, 50, 75, 100].map((v) => (
                    <button key={v} type="button" aria-pressed={m.done === v} className={m.done === v ? "is-on" : ""} onClick={() => void act({ id: uid(), type: "progress", projectId: p.id, mid: m.id, done: v, at: nowIso() })}>{v}</button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby={`ph-${p.id}`}>
        <h2 id={`ph-${p.id}`} className="panel__title">{f.photos}</h2>
        <p className="wiz__hint">{f.photosHint}</p>
        <label className="field__camera"><Camera aria-hidden="true" />{f.photo}<input type="file" accept="image/*" capture="environment" onChange={onFile(null)} /></label>
        {p.photos.length + pendingPhotos.length === 0 ? <p className="panel__meta">{f.photosEmpty}</p> : (
          <ul className="field__photos">
            {preview.map((x) => <li key={x.id}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={x.url} alt="" /><Badge variant="secondary">{f.photoPending}</Badge></li>)}
            {p.photos.map((x) => (
              <li key={x.id}>
                {online
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={`/api/field/photos/${x.id}`} alt="" loading="lazy" />
                  : <span className="field__nopreview" title={f.photoNoPreview}><CloudOff aria-hidden="true" /></span>}
                <small>{dt.format(new Date(x.takenAt))}</small>
              </li>
            ))}
          </ul>
        )}
        {!online && p.photos.length > 0 && <p className="wiz__hint">{f.photoNoPreview}</p>}
      </section>

      <section className="panel" aria-labelledby={`ho-${p.id}`}>
        <h2 id={`ho-${p.id}`} className="panel__title">{f.handover}</h2>
        {p.handover ? (
          <>
            <p role="status"><strong>{fill(f.signedOn, { date: dt.format(new Date(p.handover.signedAt)), name: p.handover.signerName })}</strong></p>
            {online ? <Button asChild variant="outline"><a href={`/api/projects/${p.id}/acta?lang=${lang}`}>{f.pdf}</a></Button> : <p className="wiz__hint">{f.pdfOffline}</p>}
          </>
        ) : (
          <form className="flow" onSubmit={(e) => {
            e.preventDefault();
            const dataUrl = sig.current?.toDataUrl();
            if (!dataUrl || !complete || name.trim().length < 2) return;
            void act({ id: uid(), type: "handover", projectId: p.id, signerName: name.trim(), signature: dataUrl, notes: notes.trim() || null, at: nowIso() });
          }}>
            <p className="wiz__hint">{f.handoverHint}</p>
            {!complete && <p role="status" className="field-error">{fill(f.needChecklist, { n: c.total - c.done })}</p>}
            <div className="field"><label htmlFor={`sn-${p.id}`}>{f.signerName}</label><Input id={`sn-${p.id}`} value={name} maxLength={120} autoComplete="off" onChange={(e) => setName(e.target.value)} /></div>
            <div className="field"><label htmlFor={`no-${p.id}`}>{f.handoverNotes}</label><Textarea id={`no-${p.id}`} rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <div className="field"><span id={`sg-${p.id}`}>{f.signHere}</span><SignaturePad label={f.signHere} clearLabel={f.clearSig} handleRef={sig} onChange={setSigEmpty} /></div>
            <div className="flow__actions"><Button type="submit" disabled={!complete || name.trim().length < 2 || sigEmpty}>{f.submit}</Button></div>
          </form>
        )}
      </section>
    </div>
  );
}

function CheckRow({ k, label, f, photos, disabled, onToggle, onNote, onFile }: {
  k: FieldProject["checks"][number]; label: string; f: Dict["app"]["fieldMode"]; photos: number; disabled: boolean;
  onToggle: (done: boolean) => void; onNote: (note: string) => void; onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [more, setMore] = useState(false);
  const [note, setNote] = useState(k.note ?? "");
  return (
    <li className={`field__check${k.done ? " is-done" : ""}`}>
      <label className="field__tick"><input type="checkbox" checked={k.done} disabled={disabled} onChange={(e) => onToggle(e.target.checked)} /><span>{label}</span></label>
      <div className="field__row-actions">
        <label className="field__mini" aria-label={`${f.photo}: ${label}`}><Camera aria-hidden="true" />{photos > 0 ? photos : ""}<input type="file" accept="image/*" capture="environment" onChange={onFile} /></label>
        <button type="button" className="field__mini" aria-expanded={more} onClick={() => setMore((v) => !v)}>{f.note}</button>
      </div>
      {more && (
        <div className="field__note">
          <Textarea aria-label={f.note} rows={2} maxLength={300} placeholder={f.notePh} value={note} onChange={(e) => setNote(e.target.value)} />
          <Button type="button" variant="outline" size="sm" onClick={() => { onNote(note.trim()); setMore(false); }}>{f.saveNote}</Button>
        </div>
      )}
      {k.note && !more && <small className="field__saved">{k.note}</small>}
    </li>
  );
}

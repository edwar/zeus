"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Award } from "lucide-react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fill, money } from "@/lib/format";
import { prepareFile } from "@/lib/image";
import { CASE_AUDIENCES, CASE_SYSTEMS, MAX_PHOTOS, missingForPublish, savingsOf } from "@/lib/cases";
import { todayBogota } from "@/lib/crm";
import {
  useCase, useCases, useConsent, useCreateCase, useDeleteCase, useDeletePhoto, usePublishCase, useSaveCase, useUploadPhoto,
  type CaseAdmin, type CaseInput,
} from "@/hooks/useCases";
import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ConfirmProvider";

const day = (lang: Locale, iso: string) => new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(iso.length > 10 ? iso : `${iso}T00:00:00Z`));
const stamp = (lang: Locale, iso: string) => new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export function CasesList({ t, lang }: { t: Dict; lang: Locale }) {
  const m = t.app.cases;
  const { data, isPending, isError, refetch } = useCases();
  const rows = data?.items ?? [];
  return (
    <div className="pb">
      <header className="ph">
        <div>
          <h1 className="ph__title">{m.title}</h1>
          <p className="ph__sub">{m.sub}</p>
        </div>
        <div className="ph__tools"><Button asChild><Link href={`/${lang}/app/cases/new`}>{m.add}</Link></Button></div>
      </header>
      {isPending ? <Loading label={m.loading} variant="table" cols={6} />
        : isError ? <p role="alert">{m.loadError} <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>{m.retry}</Button></p>
        : rows.length === 0 ? <EmptyState icon={Award} title={m.empty}><Button asChild><Link href={`/${lang}/app/cases/new`}>{m.add}</Link></Button></EmptyState>
        : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th scope="col">{m.cols.title}</th><th scope="col">{m.cols.status}</th><th scope="col">{m.cols.audience}</th><th scope="col">{m.cols.town}</th><th scope="col">{m.cols.pending}</th><th scope="col">{m.cols.updated}</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <th scope="row"><Link href={`/${lang}/app/cases/${c.id}`}>{c.titleEs}</Link></th>
                    <td><Badge variant={c.status === "published" ? "default" : "warning"}>{m.statuses[c.status]}</Badge></td>
                    <td>{m.audiences[c.audience as keyof typeof m.audiences] ?? c.audience}</td>
                    <td>{c.town || "—"}</td>
                    <td>{c.missing === 0 ? m.ready : fill(m.pendingN, { n: c.missing })}</td>
                    <td>{stamp(lang, c.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

export function CaseEditor({ t, lang, id }: { t: Dict; lang: Locale; id?: string }) {
  const m = t.app.cases;
  const back = <Link href={`/${lang}/app/cases`} className="back">← {m.back}</Link>;
  const detail = useCase(id ?? "");
  if (!id) return <div className="pb">{back}<header className="ph"><h1 className="ph__title">{m.add}</h1></header><CaseForm t={t} lang={lang} /></div>;
  if (detail.isPending) return <div className="pb">{back}<Loading label={m.loading} variant="detail" /></div>;
  if (detail.isError || !detail.data) return <div className="pb">{back}<p role="alert">{m.notFound}</p></div>;
  const c = detail.data;
  return (
    <div className="pb">
      {back}
      <header className="ph">
        <div>
          <h1 className="ph__title">{c.titleEs}</h1>
          <p className="ph__sub"><Badge variant={c.status === "published" ? "default" : "warning"}>{m.statuses[c.status]}</Badge></p>
        </div>
      </header>
      <PublishPanel t={t} lang={lang} c={c} />
      <CaseForm t={t} lang={lang} c={c} />
      <ConsentPanel t={t} lang={lang} c={c} />
      <PhotosPanel t={t} c={c} />
      <DeletePanel t={t} lang={lang} c={c} />
    </div>
  );
}

const errText = (m: Dict["app"]["cases"], e: unknown) => m.errors[(e as { code?: string }).code as keyof typeof m.errors] ?? m.errors.generic;

/** Historia, proyecto y resultado verificado: lo que se edita. Con `c` guarda cambios; sin `c` crea el borrador. */
function CaseForm({ t, lang, c }: { t: Dict; lang: Locale; c?: CaseAdmin }) {
  const m = t.app.cases;
  const uid = useId().replace(/:/g, "");
  const router = useRouter();
  const create = useCreateCase();
  const save = useSaveCase(c?.id ?? "");
  const [audience, setAudience] = useState(c?.audience ?? "home");
  const [systemType, setSystemType] = useState(c?.systemType ?? "ongrid");
  const [before, setBefore] = useState(String(c?.billBefore ?? ""));
  const [after, setAfter] = useState(String(c?.billAfter ?? ""));
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const sv = savingsOf(Number(before) || 0, Number(after) || 0);
  const busy = create.isPending || save.isPending;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    setError("");
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    const body: CaseInput = {
      titleEs: s("titleEs"), titleEn: s("titleEn"), summaryEs: s("summaryEs"), summaryEn: s("summaryEn"), quoteEs: s("quoteEs") || null, quoteEn: s("quoteEn") || null,
      displayName: s("displayName"), audience: audience as CaseInput["audience"], town: s("town"), department: s("department") || null,
      kwp: Number(s("kwp").replace(",", ".")) || 0, systemType: systemType as CaseInput["systemType"], installedOn: s("installedOn") || null,
      billBefore: Math.round(Number(before)) || 0, billAfter: Math.round(Number(after)) || 0, evidence: s("evidence"), verifiedOn: s("verifiedOn") || null,
    };
    if (c) save.mutate(body, { onSuccess: () => setMsg(m.saved), onError: (err) => setError(errText(m, err)) });
    else create.mutate(body, { onSuccess: (r) => router.push(`/${lang}/app/cases/${r.id}`), onError: (err) => setError(errText(m, err)) });
  }

  const field = (name: string, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="field"><label htmlFor={`${uid}${name}`}>{label}</label><Input id={`${uid}${name}`} name={name} {...props} /></div>
  );
  const area = (name: string, label: string, value: string | null | undefined, rows = 3, max = 600, ph?: string) => (
    <div className="field"><label htmlFor={`${uid}${name}`}>{label}</label><Textarea id={`${uid}${name}`} name={name} rows={rows} maxLength={max} placeholder={ph} defaultValue={value ?? ""} /></div>
  );

  return (
    <form className="case__form" onSubmit={submit}>
      <section className="panel">
        <h2 className="panel__title">{m.story}</h2>
        {field("titleEs", m.titleEs, { required: true, minLength: 3, maxLength: 120, defaultValue: c?.titleEs })}
        {area("summaryEs", m.summaryEs, c?.summaryEs)}
        {area("quoteEs", m.quoteEs, c?.quoteEs, 3, 500)}
        {field("displayName", m.displayName, { maxLength: 80, defaultValue: c?.displayName })}
        <p className="wiz__hint">{m.displayNameHint}</p>
        <div className="field">
          <label htmlFor={`${uid}aud`}>{m.audience}</label>
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger id={`${uid}aud`}><SelectValue /></SelectTrigger>
            <SelectContent>{CASE_AUDIENCES.map((a) => <SelectItem key={a} value={a}>{m.audiences[a]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {field("titleEn", m.titleEn, { maxLength: 120, defaultValue: c?.titleEn })}
        {area("summaryEn", m.summaryEn, c?.summaryEn)}
        {area("quoteEn", m.quoteEn, c?.quoteEn, 3, 500)}
        <p className="wiz__hint">{m.enHint}</p>
      </section>

      <section className="panel">
        <h2 className="panel__title">{m.project}</h2>
        {field("town", m.town, { maxLength: 80, defaultValue: c?.town })}
        {field("department", m.department, { maxLength: 80, defaultValue: c?.department ?? "" })}
        {field("kwp", m.kwp, { type: "number", inputMode: "decimal", step: "0.01", min: 0, max: 1000, defaultValue: c?.kwp || "" })}
        <div className="field">
          <label htmlFor={`${uid}sys`}>{m.systemType}</label>
          <Select value={systemType} onValueChange={setSystemType}>
            <SelectTrigger id={`${uid}sys`}><SelectValue /></SelectTrigger>
            <SelectContent>{CASE_SYSTEMS.map((s) => <SelectItem key={s} value={s}>{m.systems[s]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {field("installedOn", m.installedOn, { type: "date", max: todayBogota(), defaultValue: c?.installedOn ?? "" })}
      </section>

      <section className="panel">
        <h2 className="panel__title">{m.results}</h2>
        <p className="wiz__hint">{m.resultsHint}</p>
        <div className="field"><label htmlFor={`${uid}bb`}>{m.billBefore}</label><Input id={`${uid}bb`} type="number" inputMode="numeric" min={0} step={1} value={before} onChange={(e) => setBefore(e.target.value)} /></div>
        <div className="field"><label htmlFor={`${uid}ba`}>{m.billAfter}</label><Input id={`${uid}ba`} type="number" inputMode="numeric" min={0} step={1} value={after} onChange={(e) => setAfter(e.target.value)} /></div>
        {sv.amount > 0 && <p role="status" className="case__saving"><strong>{fill(m.savings, { amount: money(lang, sv.amount, "COP"), pct: sv.pct })}</strong></p>}
        {area("evidence", m.evidence, c?.evidence, 3, 500, m.evidencePh)}
        {field("verifiedOn", m.verifiedOn, { type: "date", max: todayBogota(), defaultValue: c?.verifiedOn ?? "" })}
        {c?.verifiedBy && <p className="wiz__hint">{fill(m.verifiedBy, { who: c.verifiedBy })}</p>}
      </section>

      {!c && <p className="wiz__hint">{m.createHint}</p>}
      <div className="flow__actions">
        <Button type="submit" disabled={busy}>{busy ? m.saving : c ? m.save : m.create}</Button>
      </div>
      {msg && <p role="status" className="wiz__hint">{msg}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </form>
  );
}

/** Estado de la publicación: qué falta, y publicar o retirar. */
function PublishPanel({ t, lang, c }: { t: Dict; lang: Locale; c: CaseAdmin }) {
  const m = t.app.cases;
  const publish = usePublishCase(c.id);
  const [error, setError] = useState("");
  // Se recalcula con lo que está guardado: así la lista coincide con lo que exigirá el servidor.
  const missing = missingForPublish({ ...c, consentAt: c.consent.at, consentNote: c.consent.note }, todayBogota());
  return (
    <section className="panel" aria-labelledby={`pub-${c.id}`}>
      <h2 id={`pub-${c.id}`} className="panel__title">{m.publish}</h2>
      {c.status === "published" ? (
        <>
          <p>{c.publishedAt && c.publishedBy ? fill(m.publishedOn, { date: stamp(lang, c.publishedAt), who: c.publishedBy }) : null}</p>
          <div className="flow__actions">
            <Button asChild variant="outline"><Link href={`/${lang}/cases/${c.slug}`} target="_blank">{m.viewPublic}</Link></Button>
            <Button type="button" variant="outline" disabled={publish.isPending} onClick={() => publish.mutate(false, { onError: (e) => setError(errText(m, e)) })}>{m.unpublish}</Button>
          </div>
        </>
      ) : (
        <>
          {missing.length > 0 ? (
            <div role="status">
              <p><strong>{m.missingTitle}</strong></p>
              <ul className="case__missing">{missing.map((k) => <li key={k}>{m.missing[k]}</li>)}</ul>
            </div>
          ) : <p role="status" className="case__ok">{m.readyToPublish}</p>}
          <div className="flow__actions">
            <Button type="button" disabled={publish.isPending || missing.length > 0} onClick={() => publish.mutate(true, { onError: (e) => setError(errText(m, e)) })}>{m.publishNow}</Button>
          </div>
        </>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
    </section>
  );
}

function ConsentPanel({ t, lang, c }: { t: Dict; lang: Locale; c: CaseAdmin }) {
  const m = t.app.cases;
  const uid = useId().replace(/:/g, "");
  const consent = useConsent(c.id);
  const confirm = useConfirm();
  const [note, setNote] = useState("");
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="panel" aria-labelledby={`${uid}h`}>
      <h2 id={`${uid}h`} className="panel__title">{m.consent}</h2>
      <p className="wiz__hint">{m.consentHint}</p>
      {c.consent.at ? (
        <>
          <p><strong>{fill(m.consentOn, { date: stamp(lang, c.consent.at), who: c.consent.by ?? "—" })}</strong></p>
          {c.consent.note && <p className="flow__changes">{c.consent.note}</p>}
          <div className="flow__actions">
            <Button type="button" variant="outline" disabled={consent.isPending} onClick={async () => { if (await confirm({ message: m.confirmWithdraw, confirmLabel: m.consentWithdraw })) consent.mutate({ given: false }, { onError: (e) => setError(errText(m, e)) }); }}>{m.consentWithdraw}</Button>
          </div>
          <p className="wiz__hint">{m.consentWithdrawHint}</p>
        </>
      ) : (
        <form
          className="flow"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            consent.mutate({ given: true, note: note.trim() }, { onSuccess: () => { setNote(""); setOk(false); }, onError: (err) => setError(errText(m, err)) });
          }}
        >
          {c.consent.note && <p className="flow__changes">{c.consent.note}</p>}
          <div className="field"><label htmlFor={`${uid}n`}>{m.consentNote}</label><Textarea id={`${uid}n`} rows={3} minLength={10} maxLength={300} required placeholder={m.consentNotePh} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <label className="wiz__consent"><input type="checkbox" required checked={ok} onChange={(e) => setOk(e.target.checked)} /> <span>{m.consentCheck}</span></label>
          <div className="flow__actions"><Button type="submit" disabled={consent.isPending}>{m.consentSave}</Button></div>
        </form>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
    </section>
  );
}

function PhotosPanel({ t, c }: { t: Dict; c: CaseAdmin }) {
  const m = t.app.cases;
  const uid = useId().replace(/:/g, "");
  const upload = useUploadPhoto(c.id);
  const remove = useDeletePhoto(c.id);
  const confirm = useConfirm();
  const [error, setError] = useState("");
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    upload.mutate(await prepareFile(file), { onError: (err) => setError(errText(m, err)) });
  }
  return (
    <section className="panel" aria-labelledby={`${uid}h`}>
      <h2 id={`${uid}h`} className="panel__title">{m.photos}</h2>
      <p className="wiz__hint">{m.photosHint}</p>
      {!c.storageReady && <p className="wiz__hint" role="status">{m.noStorage}</p>}
      {c.photos.length === 0 ? <p className="panel__meta">{m.photoNone}</p> : (
        <ul className="case__photos">
          {c.photos.map((p) => (
            <li key={p.url}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.alt} loading="lazy" />
              <Button type="button" variant="outline" size="sm" disabled={remove.isPending} onClick={async () => { if (await confirm({ message: m.confirmPhoto, confirmLabel: m.photoRemove })) remove.mutate(p.url, { onError: (e) => setError(errText(m, e)) }); }}>{m.photoRemove}</Button>
            </li>
          ))}
        </ul>
      )}
      <div className="field">
        <label htmlFor={`${uid}f`}>{m.photoAdd}</label>
        <Input id={`${uid}f`} type="file" accept="image/jpeg,image/png,image/webp" disabled={!c.storageReady || upload.isPending || c.photos.length >= MAX_PHOTOS} onChange={onFile} />
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </section>
  );
}

function DeletePanel({ t, lang, c }: { t: Dict; lang: Locale; c: CaseAdmin }) {
  const m = t.app.cases;
  const router = useRouter();
  const del = useDeleteCase();
  const confirm = useConfirm();
  return (
    <div className="flow__actions">
      <Button type="button" variant="outline" disabled={del.isPending} onClick={async () => { if (await confirm({ message: m.confirmDelete, subject: c.titleEs, confirmLabel: m.delete })) del.mutate(c.id, { onSuccess: () => router.push(`/${lang}/app/cases`) }); }}>{m.delete}</Button>
    </div>
  );
}

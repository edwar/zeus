"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, UserPlus } from "lucide-react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fill } from "@/lib/format";
import { formatPhone, whatsappUrl } from "@/lib/phone";
import { MANUAL_SOURCES, SOURCES, todayBogota, type Source } from "@/lib/crm";
import {
  useAddFollowUp, useAddLeadNote, useAddQuoteNote, useAssignees, useCreateLead, useCrmSummary, useDeleteFollowUp, useFollowUps, useLead, useLeads,
  usePatchFollowUp, usePatchLead, useSetQuoteSource, type FollowUp, type LeadRow,
} from "@/hooks/useCrm";
import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Loading";
import { PhoneField } from "@/components/PhoneField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ConfirmProvider";

const tabClass = "px-3 py-2 text-[0.88rem] font-bold text-(--ink-soft) hover:text-(--ink) data-[state=active]:bg-white data-[state=active]:text-(--ink) data-[state=active]:shadow-sm";
const dayFmt = (lang: Locale) => new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: "UTC" });
const day = (lang: Locale, iso: string) => dayFmt(lang).format(new Date(`${iso}T00:00:00Z`));
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
const hrefOf = (lang: Locale, k: { kind: "quote" | "lead"; id: string }) => `/${lang}/app/${k.kind === "quote" ? "quotes" : "leads"}/${k.id}`;
const todayLocal = () => todayBogota(); // mismo «hoy» que usa el servidor (hora de Colombia)

/* ───────────────────────── Recordatorios ───────────────────────── */

/** Formulario corto para agendar un seguimiento (fecha, qué hacer y a quién le toca). */
function AddFollowUpForm({ t, target, onDone }: { t: Dict; target: { kind: "quote" | "lead"; id: string }; onDone?: () => void }) {
  const m = t.app.crm.reminders;
  const uid = useId().replace(/:/g, "");
  const add = useAddFollowUp(target);
  const people = useAssignees();
  const [dueOn, setDueOn] = useState("");
  const [note, setNote] = useState("");
  const [who, setWho] = useState("");
  const [error, setError] = useState("");
  const me = people.data?.me ?? "";
  return (
    <form
      className="crm__add"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        add.mutate({ dueOn, note: note.trim(), assigneeId: who || me }, { onSuccess: () => { setNote(""); setDueOn(""); onDone?.(); }, onError: () => setError(t.app.crm.error) });
      }}
    >
      <div className="field"><label htmlFor={`${uid}d`}>{m.due}</label><Input id={`${uid}d`} type="date" required min={todayLocal()} value={dueOn} onChange={(e) => setDueOn(e.target.value)} /></div>
      <div className="field crm__grow"><label htmlFor={`${uid}n`}>{m.what}</label><Input id={`${uid}n`} required minLength={2} maxLength={300} placeholder={m.whatPh} value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <div className="field">
        <label htmlFor={`${uid}w`}>{m.assignee}</label>
        <Select value={who || me} onValueChange={setWho} disabled={!people.data}>
          <SelectTrigger id={`${uid}w`}><SelectValue /></SelectTrigger>
          <SelectContent>{(people.data?.users ?? []).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}{u.id === me ? ` (${t.app.users.you})` : ""}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={add.isPending}>{add.isPending ? m.saving : m.save}</Button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </form>
  );
}

function FollowUpItem({ t, lang, f, today, showTarget }: { t: Dict; lang: Locale; f: FollowUp; today?: string; showTarget: boolean }) {
  const m = t.app.crm.reminders;
  const patch = usePatchFollowUp();
  const del = useDeleteFollowUp();
  const confirm = useConfirm();
  const [moving, setMoving] = useState(false);
  const [date, setDate] = useState(f.dueOn);
  const late = f.bucket === "overdue" && today ? daysBetween(f.dueOn, today) : 0;
  const busy = patch.isPending || del.isPending;
  return (
    <li className={`crm__item${f.doneAt ? " is-done" : ""}`}>
      <div className="crm__main">
        <strong>{f.note}</strong>
        <small>
          {showTarget && <><Link href={hrefOf(lang, f.target)}>{f.target.name}</Link> · {f.target.kind === "lead" ? m.lead : m.quote} · </>}
          {day(lang, f.dueOn)}{late > 0 && <> · <span className="prog__late">{fill(m.late, { n: late })}</span></>}
          {f.assigneeName && <> · {m.for} {f.assigneeName}</>}
          {f.doneAt && f.doneBy && <> · {m.by} {f.doneBy}</>}
        </small>
      </div>
      <div className="crm__actions">
        {f.doneAt ? (
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => patch.mutate({ id: f.id, done: false })}>{m.undo}</Button>
        ) : moving ? (
          <>
            <Input type="date" aria-label={m.reschedule} className="crm__date" value={date} min={todayLocal()} onChange={(e) => setDate(e.target.value)} />
            <Button type="button" size="sm" disabled={busy || !date} onClick={() => patch.mutate({ id: f.id, dueOn: date }, { onSuccess: () => setMoving(false) })}>{t.app.detail.save}</Button>
          </>
        ) : (
          <>
            <Button type="button" size="sm" disabled={busy} onClick={() => patch.mutate({ id: f.id, done: true })}>{m.markDone}</Button>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setMoving(true)}>{m.reschedule}</Button>
          </>
        )}
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={async () => { if (await confirm({ message: m.confirmRemove, subject: f.note, confirmLabel: m.remove })) del.mutate(f.id); }}>{m.remove}</Button>
      </div>
    </li>
  );
}

/** Lista de recordatorios de una solicitud o de un contacto, con el formulario para agregar. */
export function FollowUpsBlock({ t, lang, target, items }: { t: Dict; lang: Locale; target: { kind: "quote" | "lead"; id: string }; items: FollowUp[] }) {
  const m = t.app.crm.reminders;
  const [adding, setAdding] = useState(false);
  return (
    <div className="crm__block">
      <div className="crm__row">
        <h3 className="flow__h">{t.app.crm.panel.reminders}</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => setAdding((v) => !v)}>{adding ? t.app.crm.contacts.cancel : m.add}</Button>
      </div>
      {adding && <AddFollowUpForm t={t} target={target} onDone={() => setAdding(false)} />}
      {items.length === 0 ? <p className="panel__meta">{m.none}</p> : (
        <ul className="crm__list">{items.map((f) => <FollowUpItem key={f.id} t={t} lang={lang} f={f} showTarget={false} />)}</ul>
      )}
    </div>
  );
}

function RemindersTab({ t, lang }: { t: Dict; lang: Locale }) {
  const m = t.app.crm.reminders;
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const { data, isPending, isError, refetch } = useFollowUps(scope);
  const groups = [
    { key: "overdue" as const, title: m.overdue },
    { key: "today" as const, title: m.today },
    { key: "upcoming" as const, title: m.upcoming },
  ];
  return (
    <div className="crm__tab">
      <Tabs value={scope} onValueChange={(v) => setScope(v as "mine" | "all")}>
        <TabsList aria-label={t.app.crm.tabs.reminders} className="h-auto bg-(--mist) p-1">
          <TabsTrigger value="mine" className={tabClass}>{m.scopeMine}</TabsTrigger>
          <TabsTrigger value="all" className={tabClass}>{m.scopeAll}</TabsTrigger>
        </TabsList>
      </Tabs>
      {isPending ? <Loading label={t.app.crm.loading} variant="table" cols={3} />
        : isError ? <p role="alert">{t.app.crm.loadError} <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>{t.app.crm.retry}</Button></p>
        : data.items.length === 0 && data.done.length === 0 ? (
          <EmptyState icon={Bell} title={scope === "mine" ? m.empty : m.emptyAll} compact />
        ) : (
          <>
            {groups.map((g) => {
              const rows = data.items.filter((i) => i.bucket === g.key);
              return rows.length === 0 ? null : (
                <section key={g.key} className="panel" aria-labelledby={`rem-${g.key}`}>
                  <h2 id={`rem-${g.key}`} className="panel__title">{g.title} <Badge variant={g.key === "overdue" ? "warning" : "outline"}>{rows.length}</Badge></h2>
                  <ul className="crm__list">{rows.map((f) => <FollowUpItem key={f.id} t={t} lang={lang} f={f} today={data.today} showTarget />)}</ul>
                </section>
              );
            })}
            {data.done.length > 0 && (
              <section className="panel" aria-labelledby="rem-done">
                <h2 id="rem-done" className="panel__title">{m.done}</h2>
                <ul className="crm__list">{data.done.map((f) => <FollowUpItem key={f.id} t={t} lang={lang} f={f} showTarget />)}</ul>
              </section>
            )}
          </>
        )}
    </div>
  );
}

/* ───────────────────────── Contactos ───────────────────────── */

function NewContactForm({ t, lang, onClose }: { t: Dict; lang: Locale; onClose: () => void }) {
  const c = t.app.crm.contacts;
  const uid = useId().replace(/:/g, "");
  const router = useRouter();
  const create = useCreateLead();
  const [source, setSource] = useState<string>("referral");
  const [error, setError] = useState<{ text: string; href?: string } | null>(null);
  return (
    <form
      className="panel crm__form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const f = new FormData(e.currentTarget);
        const val = (k: string) => String(f.get(k) ?? "").trim();
        create.mutate(
          { name: val("name"), phone: val("phone"), email: val("email"), city: val("city"), source, note: val("note") || undefined, followUpOn: val("followUpOn") || undefined, consent: true },
          {
            onSuccess: (r) => router.push(`/${lang}/app/leads/${r.id}`),
            onError: (err) => {
              const e2 = err as Error & { code?: string; of?: { kind: "quote" | "lead"; id: string; name: string } };
              setError(e2.code === "duplicate" && e2.of ? { text: fill(c.duplicate, { name: e2.of.name }), href: hrefOf(lang, e2.of) } : { text: t.app.crm.error });
            },
          },
        );
      }}
    >
      <h2 className="panel__title">{c.add}</h2>
      <p className="panel__meta">{c.sub}</p>
      <div className="field"><label htmlFor={`${uid}n`}>{c.name}</label><Input id={`${uid}n`} name="name" required minLength={2} maxLength={120} autoComplete="off" /></div>
      <PhoneField name="phone" label={c.phone} countryLabel={c.country} lang={lang} />
      <div className="field"><label htmlFor={`${uid}e`}>{c.email}</label><Input id={`${uid}e`} name="email" type="email" maxLength={160} autoComplete="off" /></div>
      <div className="field"><label htmlFor={`${uid}c`}>{c.city}</label><Input id={`${uid}c`} name="city" maxLength={80} autoComplete="off" /></div>
      <div className="field">
        <label htmlFor={`${uid}s`}>{c.source}</label>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger id={`${uid}s`}><SelectValue /></SelectTrigger>
          <SelectContent>{MANUAL_SOURCES.map((s) => <SelectItem key={s} value={s}>{t.app.crm.sources[s]}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="field"><label htmlFor={`${uid}o`}>{c.note}</label><Textarea id={`${uid}o`} name="note" rows={3} maxLength={1000} placeholder={c.notePh} /></div>
      <div className="field"><label htmlFor={`${uid}f`}>{c.followUp}</label><Input id={`${uid}f`} name="followUpOn" type="date" min={todayLocal()} /></div>
      <label className="wiz__consent"><input type="checkbox" name="consent" required /> <span>{c.consent}</span></label>
      {error && <p className="field-error" role="alert">{error.text} {error.href && <Link href={error.href}>{c.openIt} →</Link>}</p>}
      <div className="flow__actions">
        <Button type="submit" disabled={create.isPending}>{create.isPending ? c.saving : c.save}</Button>
        <Button type="button" variant="outline" onClick={onClose}>{c.cancel}</Button>
      </div>
    </form>
  );
}

const leadVariant = (s: LeadRow["status"]) => (s === "open" ? "warning" : s === "converted" ? "default" : "secondary");

function ContactsTab({ t, lang }: { t: Dict; lang: Locale }) {
  const c = t.app.crm.contacts;
  const [filter, setFilter] = useState<"all" | LeadRow["status"]>("all");
  const [adding, setAdding] = useState(false);
  const { data, isPending, isError, refetch } = useLeads(filter);
  return (
    <div className="crm__tab">
      <div className="crm__row">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList aria-label={c.status} className="h-auto flex-wrap bg-(--mist) p-1">
            {(["all", "open", "converted", "lost"] as const).map((s) => (
              <TabsTrigger key={s} value={s} className={tabClass}>{s === "all" ? c.filterAll : c.statuses[s]} <span className="tbl__sub" style={{ display: "inline", marginLeft: 4 }}>{data?.counts[s] ?? ""}</span></TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {!adding && <Button type="button" onClick={() => setAdding(true)}><UserPlus aria-hidden="true" />{c.add}</Button>}
      </div>
      {adding && <NewContactForm t={t} lang={lang} onClose={() => setAdding(false)} />}
      {isPending ? <Loading label={t.app.crm.loading} variant="table" cols={5} />
        : isError ? <p role="alert">{t.app.crm.loadError} <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>{t.app.crm.retry}</Button></p>
        : data.items.length === 0 ? <EmptyState icon={UserPlus} title={c.empty} compact />
        : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th scope="col">{c.name}</th><th scope="col">{c.source}</th><th scope="col">{c.status}</th><th scope="col">{c.next}</th><th scope="col">{c.created}</th></tr></thead>
              <tbody>
                {data.items.map((l) => (
                  <tr key={l.id}>
                    <th scope="row">
                      <Link href={`/${lang}/app/leads/${l.id}`}>{l.name}</Link>
                      <span className="tbl__sub">{l.phone ? (whatsappUrl(l.phone) ? <a href={whatsappUrl(l.phone)!} target="_blank" rel="noopener noreferrer">{formatPhone(l.phone)}</a> : l.phone) : l.email}{l.city ? ` · ${l.city}` : ""}</span>
                    </th>
                    <td>{t.app.crm.sources[l.source] ?? l.source}</td>
                    <td><Badge variant={leadVariant(l.status)}>{c.statuses[l.status]}</Badge></td>
                    <td>{l.nextFollowUp ? day(lang, l.nextFollowUp) : "—"}</td>
                    <td>{day(lang, l.createdAt.slice(0, 10))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

/* ───────────────────────── Orígenes ───────────────────────── */

function SourcesTab({ t, lang }: { t: Dict; lang: Locale }) {
  const s = t.app.crm.summary;
  const [days, setDays] = useState("90");
  const { data, isPending, isError, refetch } = useCrmSummary(days);
  const pct = new Intl.NumberFormat(lang, { style: "percent", maximumFractionDigits: 0 });
  const rows = (data?.rows ?? []).filter((r) => r.requests > 0 || r.openLeads > 0 || (MANUAL_SOURCES as readonly string[]).includes(r.source) === false);
  const sum = (k: "requests" | "attended" | "confirmed" | "approved" | "discarded" | "openLeads") => rows.reduce((n, r) => n + r[k], 0);
  const totalRequests = sum("requests");
  return (
    <div className="crm__tab">
      <div className="field crm__period">
        <label htmlFor="crm-period">{s.period}</label>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger id="crm-period"><SelectValue /></SelectTrigger>
          <SelectContent>{(["30", "90", "365", "all"] as const).map((d) => <SelectItem key={d} value={d}>{s.periods[d]}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {isPending ? <Loading label={t.app.crm.loading} variant="table" cols={7} />
        : isError ? <p role="alert">{t.app.crm.loadError} <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>{t.app.crm.retry}</Button></p>
        : rows.length === 0 ? <p className="panel__meta">{s.empty}</p>
        : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th scope="col">{s.source}</th><th scope="col" className="num">{s.requests}</th><th scope="col" className="num">{s.attended}</th><th scope="col" className="num">{s.confirmed}</th>
                    <th scope="col" className="num">{s.approved}</th><th scope="col" className="num">{s.discarded}</th><th scope="col" className="num">{s.rate}</th><th scope="col" className="num">{s.openLeads}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.source}>
                      <th scope="row">{t.app.crm.sources[r.source as Source] ?? r.source}</th>
                      <td className="num">{r.requests}</td><td className="num">{r.attended}</td><td className="num">{r.confirmed}</td><td className="num">{r.approved}</td><td className="num">{r.discarded}</td>
                      <td className="num"><strong>{r.rate == null ? "—" : pct.format(r.rate)}</strong></td><td className="num">{r.openLeads}</td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row">{s.total}</th>
                    <td className="num">{totalRequests}</td><td className="num">{sum("attended")}</td><td className="num">{sum("confirmed")}</td><td className="num">{sum("approved")}</td><td className="num">{sum("discarded")}</td>
                    <td className="num"><strong>{totalRequests ? pct.format(sum("approved") / totalRequests) : "—"}</strong></td><td className="num">{sum("openLeads")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="wiz__hint">{s.hint}</p>
            {totalRequests > 0 && totalRequests < 30 && <p className="wiz__hint">{s.lowData}</p>}
          </>
        )}
    </div>
  );
}

/* ───────────────────────── Pantallas ───────────────────────── */

export function CrmHome({ t, lang }: { t: Dict; lang: Locale }) {
  const m = t.app.crm;
  const [tab, setTab] = useState<"reminders" | "contacts" | "sources">("reminders");
  return (
    <div className="pb">
      <header className="ph">
        <div>
          <h1 className="ph__title">{m.title}</h1>
          <p className="ph__sub">{m.sub}</p>
        </div>
      </header>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList aria-label={m.title} className="h-auto bg-(--mist) p-1">
          {(["reminders", "contacts", "sources"] as const).map((k) => <TabsTrigger key={k} value={k} className={tabClass}>{m.tabs[k]}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      {tab === "reminders" && <RemindersTab t={t} lang={lang} />}
      {tab === "contacts" && <ContactsTab t={t} lang={lang} />}
      {tab === "sources" && <SourcesTab t={t} lang={lang} />}
    </div>
  );
}

export function LeadDetailView({ t, lang, id }: { t: Dict; lang: Locale; id: string }) {
  const m = t.app.crm;
  const l = m.lead;
  const { data: r, isPending, isError } = useLead(id);
  const patch = usePatchLead(id);
  const addNote = useAddLeadNote(id);
  const [note, setNote] = useState("");
  const [losing, setLosing] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const back = <Link href={`/${lang}/app/leads`} className="back">← {l.back}</Link>;
  if (isPending) return <div className="pb">{back}<Loading label={m.loading} variant="detail" /></div>;
  if (isError || !r) return <div className="pb">{back}<p role="alert">{l.notFound}</p></div>;
  const fail = (e: unknown) => setError(l.errors[(e as { code?: string }).code as keyof typeof l.errors] ?? l.errors.generic);
  const dt = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="pb">
      {back}
      <header className="ph">
        <div>
          <h1 className="ph__title">{r.name}</h1>
          <p className="ph__sub">{m.sources[r.source] ?? r.source} · <Badge variant={leadVariant(r.status)}>{m.contacts.statuses[r.status]}</Badge></p>
        </div>
      </header>
      <div className="two two--wide two--top">
        <section className="panel">
          <h2 className="panel__title">{l.data}</h2>
          <dl className="pspecs">
            {r.phone && <div><dt>{m.contacts.phone}</dt><dd>{whatsappUrl(r.phone) ? <a href={whatsappUrl(r.phone)!} target="_blank" rel="noopener noreferrer">{formatPhone(r.phone)}</a> : r.phone}</dd></div>}
            {r.email && <div><dt>{m.contacts.email}</dt><dd><a href={`mailto:${r.email}`}>{r.email}</a></dd></div>}
            {r.city && <div><dt>{m.contacts.city}</dt><dd>{r.city}</dd></div>}
            <div><dt>{m.contacts.source}</dt><dd>{m.sources[r.source] ?? r.source}</dd></div>
            <div><dt>{m.contacts.created}</dt><dd>{dt.format(new Date(r.createdAt))}</dd></div>
          </dl>
          <p className="wiz__hint">{fill(l.registered, { who: r.createdBy })} · {fill(l.consentOn, { date: dt.format(new Date(r.consentAt)) })}</p>
          {r.status === "converted" && r.quoteId && <p><strong>{l.converted}</strong> · <Link href={`/${lang}/app/quotes/${r.quoteId}`}>{l.viewQuote} →</Link></p>}
          {r.status === "open" && <p className="wiz__hint">{l.convertedHint}</p>}
          {r.status === "lost" && r.lostReason && <p className="wiz__hint">{m.contacts.statuses.lost}: {r.lostReason}</p>}
          {r.status !== "converted" && (
            <div className="flow">
              {r.status === "lost" ? (
                <div className="flow__actions"><Button type="button" variant="outline" disabled={patch.isPending} onClick={() => patch.mutate({ status: "open" }, { onError: fail })}>{l.reopen}</Button></div>
              ) : losing ? (
                <>
                  <div className="field"><label htmlFor="lead-lost">{l.lostReason}</label><Textarea id="lead-lost" rows={3} maxLength={300} placeholder={l.lostPh} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
                  <div className="flow__actions">
                    <Button type="button" variant="outline" disabled={patch.isPending || !reason.trim()} onClick={() => patch.mutate({ status: "lost", lostReason: reason.trim() }, { onSuccess: () => { setLosing(false); setReason(""); }, onError: fail })}>{l.lostConfirm}</Button>
                    <Button type="button" variant="ghost" onClick={() => setLosing(false)}>{m.contacts.cancel}</Button>
                  </div>
                </>
              ) : (
                <div className="flow__actions"><Button type="button" variant="outline" onClick={() => setLosing(true)}>{l.lost}</Button></div>
              )}
              {error && <p className="field-error" role="alert">{error}</p>}
            </div>
          )}
        </section>
        <section className="panel">
          <h2 className="panel__title">{l.notes}</h2>
          <form className="flow" onSubmit={(e) => { e.preventDefault(); if (note.trim()) addNote.mutate(note.trim(), { onSuccess: () => setNote("") }); }}>
            <div className="field"><label htmlFor="lead-note" className="sr-only">{l.addNote}</label><Textarea id="lead-note" rows={3} maxLength={1000} placeholder={l.notePh} value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <div className="flow__actions"><Button type="submit" disabled={addNote.isPending || !note.trim()}>{l.addNote}</Button></div>
          </form>
          {r.notes.length === 0 ? <p className="panel__meta">{l.noNotes}</p> : (
            <ol className="flow__log">
              {r.notes.map((n) => <li key={n.id}><strong>{n.by}</strong> <span>{dt.format(new Date(n.at))}</span><p className="flow__changes">{n.body}</p></li>)}
            </ol>
          )}
        </section>
      </div>
      <section className="panel">
        {r.status === "open" ? <FollowUpsBlock t={t} lang={lang} target={{ kind: "lead", id: r.id }} items={r.followUps} />
          : <ul className="crm__list">{r.followUps.map((f) => <FollowUpItem key={f.id} t={t} lang={lang} f={f} showTarget={false} />)}</ul>}
      </section>
    </div>
  );
}

/** Panel de seguimiento dentro de una solicitud: origen, notas y recordatorios. */
export function QuoteCrmPanel({ t, lang, r }: { t: Dict; lang: Locale; r: { id: string; source: Source; lead: { id: string; name: string } | null; followUps: FollowUp[] } }) {
  const p = t.app.crm.panel;
  const setSource = useSetQuoteSource(r.id);
  const addNote = useAddQuoteNote(r.id);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <section className="panel" aria-labelledby={`crm-${r.id}`}>
      <h2 id={`crm-${r.id}`} className="panel__title">{p.title}</h2>
      <div className="field">
        <label htmlFor={`src-${r.id}`}>{p.origin}</label>
        <Select value={r.source} onValueChange={(v) => setSource.mutate(v)} disabled={setSource.isPending}>
          <SelectTrigger id={`src-${r.id}`} className="crm__src"><SelectValue /></SelectTrigger>
          <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{t.app.crm.sources[s]}</SelectItem>)}</SelectContent>
        </Select>
        <small className="wiz__hint">{p.originHint}</small>
        {r.lead && <small>{p.fromLead}: <Link href={`/${lang}/app/leads/${r.lead.id}`}>{r.lead.name} →</Link></small>}
      </div>
      <form className="flow" onSubmit={(e) => { e.preventDefault(); setSaved(false); if (note.trim()) addNote.mutate(note.trim(), { onSuccess: () => { setNote(""); setSaved(true); } }); }}>
        <div className="field"><label htmlFor={`note-crm-${r.id}`}>{p.notes}</label><Textarea id={`note-crm-${r.id}`} rows={3} maxLength={1000} placeholder={p.notePh} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <div className="flow__actions"><Button type="submit" variant="outline" disabled={addNote.isPending || !note.trim()}>{p.addNote}</Button></div>
        {saved && <p role="status" className="wiz__hint">{p.noteDone}</p>}
      </form>
      <FollowUpsBlock t={t} lang={lang} target={{ kind: "quote", id: r.id }} items={r.followUps} />
    </section>
  );
}

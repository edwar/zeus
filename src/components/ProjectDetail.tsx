"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fill, money, num } from "@/lib/format";
import { formatPhone, whatsappUrl } from "@/lib/phone";
import { kitMonthlyKwh, stages } from "@/data/types";
import { milestoneEnd, milestoneState, overallProgress, todayIso, type MsState } from "@/lib/project-progress";
import {
  type ProjectDetail as Detail,
  useAddAlert, useAddMilestone, useDeleteAlert, useDeleteMilestone, useGenerateSchedule, useResolveAlert, useSaveMonitoring, useFieldProject, useVoidHandover, useDeleteSitePhoto, useSetNotifyClient, useRotatePortal, useEmailPortal, useProject, useSetAllMaterials, useSetMaterial, useSetMaterialSource, useUpdateMilestone, type MilestonePatch,
} from "@/hooks/useProject";
import { Activity, Boxes, CalendarDays, Check, Copy, ExternalLink, Mail, MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useCan } from "@/components/RoleContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/Loading";
import { DatePicker } from "@/components/DatePicker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirm } from "@/components/ConfirmProvider";
import { ProjectDocuments } from "@/components/ProjectDocuments";
import { useProjectMargin } from "@/hooks/useStock";

const tabClass = "px-4 text-[0.9rem] font-bold text-(--ink-soft) hover:text-(--ink) data-[state=active]:bg-white data-[state=active]:text-(--ink) data-[state=active]:shadow-sm";
const DAY = 86_400_000;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/** Avance del proyecto: porcentaje general, próximo hito, estado de cada hito y materiales. */
function ProgressPanel({ t, lang, p, onGoto }: { t: Dict; lang: Locale; p: Detail; onGoto: (tab: string) => void }) {
  const d = t.app.detail;
  const today = todayIso();
  const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", timeZone: "UTC" });
  const day = (iso: string) => fmt.format(new Date(utc(iso)));
  const endOf = milestoneEnd;

  const ms = [...p.milestones].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const state = (m: Detail["milestones"][number]): MsState => milestoneState(m, today);
  const overall = overallProgress(ms); // pondera por duración
  const doneCount = ms.filter((m) => m.done >= 100).length;
  const lateCount = ms.filter((m) => state(m) === "late").length;
  const lastEnd = ms.map(endOf).sort().at(-1) ?? today; // el hito que termina más tarde, no necesariamente el último en empezar
  const next = ms.find((m) => m.done < 100);
  const mats = p.materials;
  const matsReady = mats.filter((m) => m.ready).length;

  if (ms.length === 0) {
    return (
      <section className="panel prog">
        <h2 className="panel__title">{d.progressTitle}</h2>
        <p className="panel__meta">{d.progressEmpty}</p>
        <div><Button type="button" variant="outline" size="sm" onClick={() => onGoto("schedule")}>{d.goSchedule}</Button></div>
        {mats.length > 0 && <Bar label={`${d.materials}: ${matsReady} ${d.of} ${mats.length} ${d.ready}`} pct={(matsReady / mats.length) * 100} />}
      </section>
    );
  }
  return (
    <section className="panel prog" aria-labelledby="prog-h">
      <div className="prog__top">
        <h2 id="prog-h" className="panel__title">{d.progressTitle}</h2>
        <strong className="prog__pct">{overall} %</strong>
      </div>
      <Bar label={`${doneCount} ${d.of} ${ms.length} ${d.milestonesDone}`} pct={overall} />
      <p className="panel__meta">
        {day(ms[0].startDate)} → {day(lastEnd)}
        {lateCount > 0 && <> · <span className="prog__late">{lateCount} {d.late}</span></>}
      </p>

      {next && (
        <div className="prog__next">
          <span>{d.nextMilestone}</span>
          <strong>{next.label}</strong>
          <small>{day(next.startDate)}{next.len > 1 ? ` → ${day(endOf(next))}` : ""} · {d.crews[next.crew]}</small>
        </div>
      )}

      <ul className="prog__list">
        {ms.map((m) => {
          const st = state(m);
          return (
            <li key={m.id} className={`prog__item prog__item--${st}`}>
              <span className="prog__dot" aria-hidden="true">{st === "done" ? "✓" : ""}</span>
              <span className="prog__name">{m.label}<small>{day(m.startDate)}{m.len > 1 ? ` → ${day(endOf(m))}` : ""}</small></span>
              <span className="prog__state">{d.msState[st]}{st !== "done" && m.done > 0 ? ` · ${m.done} %` : ""}</span>
            </li>
          );
        })}
      </ul>

      {mats.length > 0 && <Bar label={`${d.materials}: ${matsReady} ${d.of} ${mats.length} ${d.ready}`} pct={(matsReady / mats.length) * 100} />}
      <div><Button type="button" variant="outline" size="sm" onClick={() => onGoto("schedule")}>{d.goSchedule}</Button></div>
    </section>
  );
}

function Bar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="prog__bar">
      <span>{label}</span>
      <div className="meter" role="img" aria-label={`${label}: ${Math.round(pct)} %`}><i className="meter--emerald" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>
    </div>
  );
}

/** Portal del cliente: el enlace se reconstruye siempre, así que se puede copiar, mandar y renovar cuando haga falta. */
function PortalPanel({ t, p, portal }: { t: Dict; p: Detail; portal: { url: string; whatsapp: string } }) {
  const d = t.app.detail.portal;
  const share = t.app.quotes.share;
  const rotate = useRotatePortal(p.id);
  const confirm = useConfirm();
  const mail = useEmailPortal(p.id);
  const [link, setLink] = useState(portal);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<"sent" | "failed" | "skipped" | "error" | null>(null);
  const [error, setError] = useState("");
  return (
    <div className="flow">
      <h3 className="flow__h">{d.title}</h3>
      <p className="wiz__hint">{d.hint}</p>
      <Input readOnly aria-label={d.title} value={link.url} onFocus={(e) => e.currentTarget.select()} />
      <div className="flow__actions">
        <Button asChild variant="outline" size="sm"><a href={link.url} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" />{d.open}</a></Button>
        <Button type="button" variant="outline" size="sm" onClick={async () => { await navigator.clipboard.writeText(link.url).catch(() => {}); setCopied(true); }}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? d.copied : d.copy}</Button>
        <Button type="button" variant="outline" size="sm" disabled={mail.isPending} onClick={() => { setResult(null); mail.mutate(undefined, { onSuccess: (r) => setResult(r.outcome ?? "failed"), onError: () => setResult("error") }); }}><Mail aria-hidden="true" />{mail.isPending ? share.emailSending : d.email}</Button>
        <Button asChild variant="outline" size="sm"><a href={link.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" />{d.whatsapp}</a></Button>
      </div>
      {result && <p role="status" className={result === "sent" ? "wiz__hint" : "field-error"}>{share.emailResult[result === "error" ? "failed" : result]}</p>}
      <div className="flow__actions">
        <Button type="button" variant="outline" size="sm" disabled={rotate.isPending} onClick={async () => {
          if (!(await confirm({ message: d.confirmRotate, confirmLabel: d.rotate }))) return;
          setError("");
          setCopied(false);
          rotate.mutate(undefined, { onSuccess: (r) => setLink(r), onError: () => setError(d.error) });
        }}>{d.rotate}</Button>
      </div>
      <p className="wiz__hint">{d.rotateHint}</p>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

/** Instalación vista desde la oficina: lo que el equipo marcó y fotografió en obra, y el acta de entrega. */
function Install({ t, lang, p }: { t: Dict; lang: Locale; p: Detail }) {
  const d = t.app.detail.install;
  const manage = useCan("projects.manage");
  const { data, isPending, isError } = useFieldProject(p.id, lang);
  const voidIt = useVoidHandover(p.id);
  const confirm = useConfirm();
  const delPhoto = useDeleteSitePhoto(p.id);
  const dt = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" });
  if (isPending) return <Loading label={d.title} variant="detail" />;
  if (isError || !data) return <p role="alert">{d.loadError}</p>;
  return (
    <div className="pb">
      <section className="panel" aria-labelledby={`ins-${p.id}`}>
        <div className="prog__top">
          <h2 id={`ins-${p.id}`} className="panel__title">{d.title}</h2>
          <Button asChild variant="outline" size="sm"><Link href={`/${lang}/app/field?p=${p.id}`}>{d.openField}</Link></Button>
        </div>
        {data.checks.length === 0 ? <p className="panel__meta">{d.empty}</p> : (
          <ul className="field__checks">
            {data.checks.map((c) => (
              <li key={c.key} className={`field__check${c.done ? " is-done" : ""}`}>
                <strong>{c.done ? "✓ " : "○ "}{lang === "en" ? c.labelEn : c.labelEs}</strong>
                <small>{c.done && c.doneAt ? fill(d.done, { when: dt.format(new Date(c.doneAt)), who: c.doneBy ?? "—" }) : d.pending}</small>
                {c.note && <small className="field__saved">{c.note}</small>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby={`insp-${p.id}`}>
        <h2 id={`insp-${p.id}`} className="panel__title">{d.photos}</h2>
        <p className="wiz__hint">{d.photosHint}</p>
        {data.photos.length === 0 ? <p className="panel__meta">{d.photosEmpty}</p> : (
          <ul className="field__photos">
            {data.photos.map((x) => {
              const step = data.checks.find((c) => c.key === x.checkKey);
              return (
                <li key={x.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <a href={`/api/field/photos/${x.id}`} target="_blank" rel="noopener noreferrer"><img src={`/api/field/photos/${x.id}`} alt={step ? fill(d.step, { label: lang === "en" ? step.labelEn : step.labelEs }) : d.photos} loading="lazy" /></a>
                  <small>{dt.format(new Date(x.takenAt))}{x.by ? ` · ${x.by}` : ""}</small>
                  {manage && <Button type="button" variant="outline" size="sm" disabled={delPhoto.isPending} onClick={async () => { if (await confirm({ message: d.confirmPhoto, confirmLabel: d.removePhoto })) delPhoto.mutate(x.id); }}>{d.removePhoto}</Button>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby={`insh-${p.id}`}>
        <h2 id={`insh-${p.id}`} className="panel__title">{d.handover}</h2>
        {data.handover ? (
          <>
            <p><strong>{fill(d.signedOn, { date: dt.format(new Date(data.handover.signedAt)), name: data.handover.signerName })}</strong></p>
            <div className="flow__actions">
              <Button asChild variant="outline"><a href={`/api/projects/${p.id}/acta?lang=${lang}`}>{d.pdf}</a></Button>
              {manage && <Button type="button" variant="outline" disabled={voidIt.isPending} onClick={async () => { if (await confirm({ message: d.confirmVoid, subject: data.handover?.signerName, confirmLabel: d.voidHandover })) voidIt.mutate(); }}>{d.voidHandover}</Button>}
            </div>
          </>
        ) : <p className="panel__meta">{d.notDelivered}</p>}
      </section>
    </div>
  );
}

/** Interruptor: ¿se le avisa por correo al cliente cuando el proyecto avanza de etapa? */
function NotifyToggle({ t, p }: { t: Dict; p: Detail }) {
  const d = t.app.detail;
  const set = useSetNotifyClient(p.id);
  // Cambia al instante y vuelve atrás si el servidor no lo aceptó.
  const [on, setOn] = useState(p.notifyClient ?? false);
  return (
    <div>
      <label className="wiz__consent"><input type="checkbox" checked={on} onChange={(e) => { const v = e.target.checked; setOn(v); set.mutate(v, { onError: () => setOn(!v) }); }} /> <span>{d.notify}</span></label>
      <p className="wiz__hint">{d.notifyHint}</p>
    </div>
  );
}

function Summary({ t, lang, p, onGoto }: { t: Dict; lang: Locale; p: Detail; onGoto: (tab: string) => void }) {
  const d = t.app.detail;
  const cur = stages.indexOf(p.stage);
  return (
    <div className="pb">
      <ol className="track" aria-label={d.stage}>
        {stages.map((s, i) => (
          <li key={s} aria-current={i === cur ? "step" : undefined} className={i < cur ? "is-done" : i === cur ? "is-cur" : ""}>
            <span>{t.app.stages[s]}</span>
          </li>
        ))}
      </ol>
      <div className="two two--wide two--top">
        <section className="panel">
          <h2 className="panel__title">{d.quote}</h2>
          <dl className="kv">
            <div><dt>{d.client}</dt><dd>{p.client}</dd></div>
            <div><dt>{t.app.projects.size}</dt><dd>{p.kwp} kWp</dd></div>
            <div><dt>{d.est}</dt><dd>{num(lang, kitMonthlyKwh(p.kwp))} kWh</dd></div>
            <div><dt>{t.app.projects.owner}</dt><dd>{p.owner}</dd></div>
            {p.installFee != null && <div><dt>{d.installFee}</dt><dd>{money(lang, p.installFee, "COP")}</dd></div>}
            {p.teamDetail && p.teamDetail.members.length > 0 && <div><dt>{d.members}</dt><dd>{p.teamDetail.members.join(", ")}</dd></div>}
            <div><dt>{d.team}</dt><dd>{p.teamDetail ? <><Link href={`/${lang}/app/teams/${p.teamDetail.id}`}>{p.teamDetail.name}</Link>{whatsappUrl(p.teamDetail.phone) && <> · <a href={whatsappUrl(p.teamDetail.phone)!} target="_blank" rel="noopener noreferrer">{formatPhone(p.teamDetail.phone)}</a></>}</> : d.noTeam}</dd></div>
          </dl>
          {p.quoteId && <p><Link href={`/${lang}/app/quotes/${p.quoteId}`}>{d.fromQuote} →</Link></p>}
          {p.notifyClient != null && <NotifyToggle t={t} p={p} />}
          {p.portal && <PortalPanel t={t} p={p} portal={p.portal} />}
          {p.materials.length > 0 && <MarginPanel t={t} lang={lang} p={p} />}
        </section>
        <ProgressPanel t={t} lang={lang} p={p} onGoto={onGoto} />
      </div>
    </div>
  );
}

/** Margen del kit (venta menos costo). Solo lo ve quien maneja el inventario; el equipo de instalación no. */
function MarginPanel({ t, lang, p }: { t: Dict; lang: Locale; p: Detail }) {
  const d = t.app.detail.margin;
  const can = useCan("stock");
  const { data } = useProjectMargin(p.id, can);
  if (!can || !data) return null;
  return (
    <div className="margin" aria-label={d.title}>
      <h3 className="panel__title">{d.title}</h3>
      <dl className="kv">
        <div><dt>{d.revenue}</dt><dd>{money(lang, data.revenue, "COP")}</dd></div>
        <div><dt>{d.cost}</dt><dd>{money(lang, data.cost, "COP")}</dd></div>
        <div><dt>{d.margin}</dt><dd><strong>{money(lang, data.margin, "COP")}{data.pct != null ? ` (${num(lang, data.pct)} %)` : ""}</strong></dd></div>
      </dl>
      <p className="wiz__hint">{d.hint}{data.estimated ? ` ${d.estimated}` : ""}{data.incomplete ? ` ${d.incomplete}` : ""}</p>
    </div>
  );
}

function Gantt({ t, lang, p }: { t: Dict; lang: Locale; p: Detail }) {
  const d = t.app.detail;
  const today = todayIso();
  const { from, days } = useMemo(() => {
    const first = Math.min(utc(today), ...p.milestones.map((m) => utc(m.startDate)));
    const last = Math.max(utc(today), ...p.milestones.map((m) => utc(m.startDate) + m.len * DAY));
    const dow = (new Date(first).getUTCDay() + 6) % 7; // lunes = 0
    const from = first - dow * DAY;
    return { from, days: Math.max(28, Math.ceil((last - from) / DAY / 7) * 7) };
  }, [p.milestones, today]);
  const todayIdx = Math.round((utc(today) - from) / DAY);
  const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", timeZone: "UTC" });
  return (
    <div className="gantt-scroll" tabIndex={0} role="region" aria-label={d.tabs.schedule}>
      <div className="gantt" style={{ ["--days" as string]: days, minWidth: `${Math.max(52, days * 1.6 + 13)}rem` }}>
        <div className="gantt__head" aria-hidden="true">
          <span className="gantt__label" />
          <div className="gantt__days">
            {Array.from({ length: days }, (_, i) => {
              const dt = new Date(from + i * DAY);
              return <span key={i} className={`${i === todayIdx ? "is-today" : ""} ${[0, 6].includes(dt.getUTCDay()) ? "is-off" : ""}`}>{fmt.format(dt)}</span>;
            })}
          </div>
        </div>
        {p.milestones.map((m) => {
          const start = Math.round((utc(m.startDate) - from) / DAY);
          return (
            <div key={m.id} className="gantt__row">
              <span className="gantt__label"><strong>{m.label}</strong><small>{d.crews[m.crew]}</small></span>
              <div className="gantt__track">
                <span className="gantt__today" style={{ left: `calc(${todayIdx} * (100% / var(--days)))` }} aria-hidden="true" />
                <div className={`gantt__bar gantt__bar--${m.crew}`} style={{ left: `calc(${start} * (100% / var(--days)))`, width: `calc(${m.len} * (100% / var(--days)))` }} role="img" aria-label={`${m.label}, ${d.crews[m.crew]}, ${m.done}%`}>
                  <i style={{ width: `${m.done}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgressInput({ value, label, onCommit }: { value: number; label: string; onCommit: (n: number) => void }) {
  const [v, setV] = useState(String(value));
  const commit = () => {
    const n = Math.max(0, Math.min(100, Math.round(Number(v))));
    setV(String(Number.isFinite(n) ? n : value));
    if (Number.isFinite(n) && n !== value) onCommit(n);
  };
  return <Input type="number" min={0} max={100} aria-label={label} className="w-20 text-right" value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} />;
}

function MilestoneRow({ t, lang, m, busy, onPatch, onRemove }: { t: Dict; lang: Locale; m: Detail["milestones"][number]; busy: boolean; onPatch: (patch: MilestonePatch, done?: { ok: () => void; fail: () => void }) => void; onRemove: () => void }) {
  const d = t.app.detail;
  const manage = useCan("projects.manage");
  const uid = useId().replace(/:/g, "");
  const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", timeZone: "UTC" });
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(m.label);
  const [start, setStart] = useState(m.startDate);
  const [len, setLen] = useState(String(m.len));
  const [crew, setCrew] = useState<"A" | "B" | "E">(m.crew);
  const [error, setError] = useState("");

  const open = () => { setLabel(m.label); setStart(m.startDate); setLen(String(m.len)); setCrew(m.crew); setError(""); setEditing(true); };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Math.round(Number(len));
    if (label.trim().length < 2 || !start || !(n >= 1 && n <= 365)) { setError(d.saveError); return; }
    setError("");
    onPatch({ label: label.trim(), startDate: start, len: n, crew }, { ok: () => setEditing(false), fail: () => setError(d.saveError) });
  };
  const progress = <ProgressInput key={m.done} value={m.done} label={`${d.progress}: ${m.label}`} onCommit={(n) => onPatch({ done: n })} />;

  if (!editing) {
    return (
      <tr>
        <th scope="row">{m.label}</th>
        <td>{d.crews[m.crew]}</td>
        <td>{fmt.format(new Date(utc(m.startDate)))}</td>
        <td className="num">{m.len}</td>
        <td className="num">{progress}</td>
        <td className="num">
          {manage && (
            <span className="rowact">
              <Button type="button" variant="outline" size="sm" onClick={open}>{d.edit}</Button>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onRemove}>{d.remove}</Button>
            </span>
          )}
        </td>
      </tr>
    );
  }
  return (
    <tr className="is-editing">
      <th scope="row"><Input aria-label={d.milestoneName} value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} form={`${uid}f`} required /></th>
      <td>
        <Select value={crew} onValueChange={(v) => setCrew(v as "A" | "B" | "E")}>
          <SelectTrigger aria-label={d.crew}><SelectValue /></SelectTrigger>
          <SelectContent>{(["A", "B", "E"] as const).map((c) => <SelectItem key={c} value={c}>{d.crews[c]}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td><DatePicker value={start} onChange={setStart} lang={lang} placeholder={d.pickDate} /></td>
      <td className="num"><Input aria-label={d.days} type="number" min={1} max={365} className="w-20 text-right" value={len} onChange={(e) => setLen(e.target.value)} form={`${uid}f`} /></td>
      <td className="num">{progress}</td>
      <td className="num">
        <form id={`${uid}f`} onSubmit={save} className="rowact">
          <Button type="submit" size="sm" disabled={busy}>{d.save}</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>{d.cancel}</Button>
        </form>
        {error && <p className="field-error" role="alert">{error}</p>}
      </td>
    </tr>
  );
}

function Schedule({ t, lang, p }: { t: Dict; lang: Locale; p: Detail }) {
  const d = t.app.detail;
  const manage = useCan("projects.manage");
  const uid = useId().replace(/:/g, "");
  const add = useAddMilestone(p.id);
  const upd = useUpdateMilestone(p.id);
  const del = useDeleteMilestone(p.id);
  const confirm = useConfirm();
  const gen = useGenerateSchedule(p.id, lang);
  const [label, setLabel] = useState("");
  const [start, setStart] = useState(todayIso);
  const [projectStart, setProjectStart] = useState(todayIso);
  const [len, setLen] = useState("1");
  const [crew, setCrew] = useState<"A" | "B" | "E">("A");
  const [error, setError] = useState("");
  const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", timeZone: "UTC" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const n = Math.round(Number(len));
    if (label.trim().length < 2 || !start || !(n >= 1)) { setError(d.saveError); return; }
    add.mutate({ label: label.trim(), startDate: start, len: n, crew }, { onSuccess: () => { setLabel(""); setLen("1"); }, onError: () => setError(d.saveError) });
  }

  return (
    <div className="pb">
      {p.milestones.length === 0 ? (
        manage ? (
          <EmptyState wide compact icon={CalendarDays} title={t.app.empty.schedule.title} description={t.app.empty.schedule.desc}>
            <div className="kform__start">
            <div className="field">
              <label htmlFor={`${uid}ps`}>{d.projectStart}</label>
              <DatePicker id={`${uid}ps`} value={projectStart} min={todayIso()} onChange={setProjectStart} lang={lang} placeholder={d.pickDate} />
            </div>
            <Button type="button" disabled={gen.isPending || !projectStart} onClick={() => { setError(""); gen.mutate(projectStart, { onError: () => setError(d.saveError) }); }}>{gen.isPending ? d.generating : d.generate}</Button>
            </div>
          </EmptyState>
        ) : (
          <EmptyState icon={CalendarDays} title={t.app.empty.scheduleTeam.title} description={t.app.empty.scheduleTeam.desc} />
        )
      ) : <Gantt t={t} lang={lang} p={p} />}

      {p.milestones.length > 0 && (
        <section className="panel">
          <div className="tbl-wrap">
            <table className="tbl tbl--compact">
              <thead><tr><th scope="col">{d.milestoneName}</th><th scope="col">{d.crew}</th><th scope="col">{d.start}</th><th scope="col" className="num">{d.days}</th><th scope="col" className="num">{d.progress}</th><th scope="col"><span className="sr-only">{d.remove}</span></th></tr></thead>
              <tbody>
                {p.milestones.map((m) => (
                  <MilestoneRow
                    key={m.id}
                    t={t}
                    lang={lang}
                    m={m}
                    busy={upd.isPending || del.isPending}
                    onPatch={(patch, cb) => upd.mutate({ mid: m.id, ...patch }, { onSuccess: () => cb?.ok(), onError: () => cb?.fail() })}
                    onRemove={async () => { if (await confirm({ message: d.confirmDeleteMilestone, subject: m.label, confirmLabel: d.remove })) del.mutate(m.id); }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {manage && <form className="panel kform" onSubmit={submit}>
        <h2 className="panel__title">{d.addMilestone}</h2>
        <div className="kform__grid">
          <div className="field"><label htmlFor={`${uid}l`}>{d.milestoneName}</label><Input id={`${uid}l`} value={label} maxLength={120} placeholder={d.milestoneNamePh} onChange={(e) => setLabel(e.target.value)} required /></div>
          <div className="field"><label htmlFor={`${uid}s`}>{d.start}</label><DatePicker id={`${uid}s`} value={start} onChange={setStart} lang={lang} placeholder={d.pickDate} /></div>
          <div className="field"><label htmlFor={`${uid}d`}>{d.days}</label><Input id={`${uid}d`} type="number" min={1} max={365} value={len} onChange={(e) => setLen(e.target.value)} required /></div>
          <div className="field">
            <label htmlFor={`${uid}c`}>{d.crew}</label>
            <Select value={crew} onValueChange={(v) => setCrew(v as "A" | "B" | "E")}>
              <SelectTrigger id={`${uid}c`}><SelectValue /></SelectTrigger>
              <SelectContent>{(["A", "B", "E"] as const).map((c) => <SelectItem key={c} value={c}>{d.crews[c]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div><Button type="submit" disabled={add.isPending}>{d.addMilestone}</Button></div>
      </form>}
    </div>
  );
}

function Materials({ t, p }: { t: Dict; p: Detail }) {
  const d = t.app.detail;
  const set = useSetMaterial(p.id);
  const all = useSetAllMaterials(p.id);
  const setSource = useSetMaterialSource(p.id);
  const [srcError, setSrcError] = useState("");
  if (p.materials.length === 0) return <EmptyState icon={Boxes} title={t.app.empty.materials.title} description={t.app.empty.materials.desc} />;
  const ready = p.materials.filter((m) => m.ready).length;
  return (
    <section className="panel">
      <p className="panel__meta" role="status">{ready} {d.of} {p.materials.length} {d.ready}</p>
      <div className="meter meter--lg" aria-hidden="true"><i className="meter--emerald" style={{ width: `${(ready / p.materials.length) * 100}%` }} /></div>
      <ul className="check">
        {p.materials.map((m) => (
          <li key={m.id}>
            <label className="check__item">
              <input type="checkbox" checked={m.ready} onChange={() => set.mutate({ mid: m.id, ready: !m.ready })} />
              <span className="check__box" aria-hidden="true" />
              <span className="check__text">{m.name}</span>
              <span className="check__qty">×{m.qty}</span>
            </label>
            {m.source && (
              <div className="mat__src">
                {m.onHand != null ? (
                  <Select value={m.source} onValueChange={(v) => { setSrcError(""); setSource.mutate({ mid: m.id, source: v as "stock" | "supplier" }, { onError: () => setSrcError(d.mat.error) }); }}>
                    <SelectTrigger size="sm" aria-label={fill(d.mat.sourceFor, { name: m.name })}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock">{d.mat.stock}</SelectItem>
                      <SelectItem value="supplier">{d.mat.supplier}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : <Badge>{d.mat.supplier}</Badge>}
                {m.source === "stock" && m.onHand != null && (m.ready ? <small>{d.mat.deducted}</small> : <small className={m.onHand < m.qty ? "field-error" : undefined}>{fill(m.onHand < m.qty ? d.mat.short : d.mat.have, { n: m.onHand })}</small>)}
              </div>
            )}
          </li>
        ))}
      </ul>
      {srcError && <p className="field-error" role="alert">{srcError}</p>}
      <Button type="button" variant="outline" size="sm" disabled={all.isPending || ready === p.materials.length} onClick={() => all.mutate(true)}>{d.markAll}</Button>
    </section>
  );
}

/** Enlace a la app o nube del inversor, donde el cliente y el equipo ven la producción real. */
function MonitorLink({ t, p }: { t: Dict; p: Detail }) {
  const d = t.app.detail;
  const manage = useCan("projects.manage");
  const uid = useId().replace(/:/g, "");
  const save = useSaveMonitoring(p.id);
  const [editing, setEditing] = useState(!p.monitorUrl && manage);
  const [url, setUrl] = useState(p.monitorUrl ?? "");
  const [note, setNote] = useState(p.monitorNote ?? "");
  const [error, setError] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    save.mutate({ url: url.trim() || null, note: note.trim() || null }, { onSuccess: () => setEditing(!url.trim()), onError: () => setError(d.monitorUrlError) });
  };
  return (
    <section className="panel" aria-labelledby={`${uid}h`}>
      <h2 id={`${uid}h`} className="panel__title">{d.monitorApp}</h2>
      {!manage && !p.monitorUrl ? (
        <p className="panel__meta">{d.noMonitorLink}</p>
      ) : !editing && p.monitorUrl ? (
        <div className="mon__link">
          <Button asChild><a href={p.monitorUrl} target="_blank" rel="noopener noreferrer">{d.monitorOpen} ↗</a></Button>
          {p.monitorNote && <p className="panel__meta">{p.monitorNote}</p>}
          {manage && <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>{d.monitorEdit}</Button>}
        </div>
      ) : (
        <form className="kform" onSubmit={submit}>
          <p className="wiz__hint">{d.monitorHint}</p>
          <div className="kform__grid kform__grid--team">
            <div className="field"><label htmlFor={`${uid}u`}>{d.monitorUrl}</label><Input id={`${uid}u`} type="url" inputMode="url" maxLength={500} placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} /></div>
            <div className="field"><label htmlFor={`${uid}n`}>{d.monitorNote}</label><Input id={`${uid}n`} maxLength={200} placeholder={d.monitorNotePh} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          </div>
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="flow__actions">
            <Button type="submit" disabled={save.isPending}>{d.monitorSave}</Button>
            {p.monitorUrl && <Button type="button" variant="outline" onClick={() => { setUrl(p.monitorUrl ?? ""); setNote(p.monitorNote ?? ""); setEditing(false); }}>{d.cancel}</Button>}
          </div>
        </form>
      )}
    </section>
  );
}

function Monitoring({ t, lang, p }: { t: Dict; lang: Locale; p: Detail }) {
  const d = t.app.detail;
  const manage = useCan("projects.manage");
  const f = t.app.field;
  const uid = useId().replace(/:/g, "");
  const add = useAddAlert(p.id);
  const resolve = useResolveAlert(p.id);
  const del = useDeleteAlert(p.id);
  const confirm = useConfirm();
  const [severity, setSeverity] = useState<"high" | "mid" | "low">("mid");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fmt = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" });
  const open = p.alerts.filter((a) => !a.resolvedAt);
  const done = p.alerts.filter((a) => a.resolvedAt);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (message.trim().length < 3) return;
    add.mutate({ severity, message: message.trim() }, { onSuccess: () => setMessage(""), onError: () => setError(d.saveError) });
  };

  const row = (a: Detail["alerts"][number]) => (
    <li key={a.id} className={`alert alert--${a.severity} ${a.resolvedAt ? "is-acked" : ""}`}>
      <div>
        <span className="alert__sev">{f.severity[a.severity]}</span>
        <p className="alert__text">{a.message}</p>
        <p className="alert__meta">
          {fmt.format(new Date(a.at))}{a.by ? ` · ${a.by}` : ""}
          {a.resolvedAt && ` · ${d.resolvedBy.replace("{who}", a.resolvedBy ?? "—").replace("{when}", fmt.format(new Date(a.resolvedAt)))}`}
        </p>
      </div>
      <div className="alert__actions">
        <Button type="button" variant="outline" size="sm" disabled={resolve.isPending} onClick={() => resolve.mutate({ aid: a.id, resolved: !a.resolvedAt })}>{a.resolvedAt ? d.reopen : d.resolve}</Button>
        {manage && <Button type="button" variant="outline" size="sm" disabled={del.isPending} onClick={async () => { if (await confirm({ message: d.confirmDeleteAlert, subject: a.message, confirmLabel: d.remove })) del.mutate(a.id); }}>{d.remove}</Button>}
      </div>
    </li>
  );

  return (
    <div className="pb">
      <MonitorLink t={t} p={p} />

      <section className="panel" aria-labelledby={`${uid}a`}>
        <h2 id={`${uid}a`} className="panel__title">{d.alerts} {open.length > 0 && <Badge variant="warning">{open.length} {d.openCount}</Badge>}</h2>
        {p.alerts.length === 0 ? <EmptyState compact icon={Activity} title={t.app.empty.alerts.title} description={t.app.empty.alerts.desc} /> : (
          <>
            {open.length > 0 ? <ul className="alerts">{open.map(row)}</ul> : <p className="panel__meta" role="status">{d.allClear}</p>}
            {done.length > 0 && (
              <details className="mon__done">
                <summary>{d.resolvedList.replace("{n}", String(done.length))}</summary>
                <ul className="alerts">{done.map(row)}</ul>
              </details>
            )}
          </>
        )}
      </section>

      <form className="panel kform" onSubmit={submit}>
        <h2 className="panel__title">{d.addAlert}</h2>
        <div className="kform__grid kform__grid--alert">
          <div className="field">
            <label htmlFor={`${uid}s`}>{d.severity}</label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as "high" | "mid" | "low")}>
              <SelectTrigger id={`${uid}s`}><SelectValue /></SelectTrigger>
              <SelectContent>{(["high", "mid", "low"] as const).map((k) => <SelectItem key={k} value={k}>{f.severity[k]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="field"><label htmlFor={`${uid}m`}>{d.alertMessage}</label><Input id={`${uid}m`} value={message} maxLength={300} placeholder={d.alertPh} onChange={(e) => setMessage(e.target.value)} required minLength={3} /></div>
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div><Button type="submit" disabled={add.isPending}>{d.addAlert}</Button></div>
      </form>
    </div>
  );
}

export function ProjectDetail({ t, lang, id }: { t: Dict; lang: Locale; id: string }) {
  const d = t.app.detail;
  const { data: p, isPending, isError, refetch } = useProject(id);
  const [tab, setTab] = useState("summary");
  const back = <Link href={`/${lang}/app/projects`} className="back">← {d.back}</Link>;
  if (isPending) return <div className="pb">{back}<Loading label={t.app.projects.loading} variant="detail" /></div>;
  if (isError || !p) return <div className="pb">{back}<p role="alert">{t.app.projects.loadError} <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>{t.app.projects.retry}</Button></p></div>;
  return (
    <Tabs value={tab} onValueChange={setTab} className="pb gap-(--s5)">
      {back}
      <header className="ph">
        <div>
          <h1 className="ph__title">{p.name}</h1>
          <p className="ph__sub">{p.client} · {p.town} · {p.kwp} kWp</p>
        </div>
      </header>
      <TabsList aria-label={p.name} className="bg-(--mist) p-1 group-data-[orientation=horizontal]/tabs:h-11 self-start max-w-full justify-start overflow-x-auto">
        {(["summary", "schedule", "materials", "install", "documents", "monitoring"] as const).map((k) => <TabsTrigger key={k} value={k} className={tabClass}>{d.tabs[k]}</TabsTrigger>)}
      </TabsList>
      <TabsContent value="summary"><Summary t={t} lang={lang} p={p} onGoto={setTab} /></TabsContent>
      <TabsContent value="schedule"><Schedule t={t} lang={lang} p={p} /></TabsContent>
      <TabsContent value="materials"><Materials t={t} p={p} /></TabsContent>
      <TabsContent value="install"><Install t={t} lang={lang} p={p} /></TabsContent>
      <TabsContent value="documents"><ProjectDocuments t={t} lang={lang} projectId={p.id} hasPortal={Boolean(p.portal)} /></TabsContent>
      <TabsContent value="monitoring"><Monitoring t={t} lang={lang} p={p} /></TabsContent>
    </Tabs>
  );
}

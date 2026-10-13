"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy, Download, Mail, MessageCircle } from "lucide-react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { money, num } from "@/lib/format";
import { formatPhone, whatsappUrl } from "@/lib/phone";
import { distanceKm } from "@/lib/service-area";
import { useTeams } from "@/hooks/useTeams";
import { QuoteCrmPanel } from "@/components/CrmManager";
import { QuoteSteps } from "@/components/QuoteSteps";
import { QuoteKitSection } from "@/components/QuoteKitSection";
import { EmptyState } from "@/components/EmptyState";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/Loading";
import { DataPagination } from "@/components/DataPagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type QuoteStatus, useQuote, useQuotes, useSetFulfillment, useSetQuoteStatus, useSetQuoteTeam, useShareQuote, useEmailQuoteLink, type NoticeOutcome } from "@/hooks/useQuotes";
import { QUOTE_STATUSES, TRANSITIONS, kitEditable, needsNote } from "@/lib/quote-flow";
import { shareMessage, whatsappShareUrl } from "@/lib/quote-share";
import { useConfirm } from "@/components/ConfirmProvider";

const PAGE_SIZES = [10, 25, 50, 100] as const;

const variant = (s: QuoteStatus) => (s === "new" ? "warning" : s === "contacted" ? "outline" : s === "discarded" ? "secondary" : "default");

/** Acciones disponibles según el estado, con nota opcional (obligatoria al descartar) y el historial de cambios. */
/** "install → kit_only\nnota" se muestra con las etiquetas legibles. */
function fulfillmentNote(note: string, f: { [k: string]: unknown }) {
  const [first, ...rest] = note.split("\n");
  const label = (k: string) => (typeof f[k.trim()] === "string" ? (f[k.trim()] as string) : k);
  return [first.split("→").map(label).join(" → "), ...rest].join("\n");
}

/** "accepted\ncomentario" del evento de respuesta del cliente → etiqueta legible + comentario. */
function decisionNote(note: string, share: Dict["app"]["quotes"]["share"]) {
  const [d, ...rest] = note.split("\n");
  return [share.decisions[d as "accepted" | "declined"] ?? d, ...rest].join("\n");
}

/** "stage_install|sent" del evento de aviso → «Etapa: instalación — enviado por correo». */
function noticeNote(note: string, share: Dict["app"]["quotes"]["share"]) {
  const [kind, outcome] = note.split("|");
  const label = share.notices[kind as keyof typeof share.notices] ?? kind;
  const result = share.outcomes[outcome as keyof typeof share.outcomes] ?? outcome;
  return `${label} — ${result}`;
}

function FlowPanel({ t, lang, id, status, events }: { t: Dict; lang: Locale; id: string; status: QuoteStatus; events: { id: string; kitChange: boolean; subject: string | null; from: QuoteStatus | null; to: QuoteStatus; note: string | null; by: string; at: string }[] }) {
  const q = t.app.quotes;
  const f = q.flow;
  const set = useSetQuoteStatus();
  const confirm = useConfirm();
  const [note, setNote] = useState("");
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState("");
  const date = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" });

  async function go(to: QuoteStatus) {
    setError("");
    if (needsNote(to) && !note.trim()) { setError(f.errors.note_required); return; }
    // Aprobar crea el proyecto y no se puede deshacer: se pide confirmar.
    if (to === "approved" && !(await confirm({ message: f.approveConfirm, confirmLabel: f.actions.approved }))) return;
    set.mutate(
      { id, status: to, note: note.trim() || undefined },
      {
        onSuccess: () => { setNote(""); setDiscarding(false); },
        onError: (e) => {
          const code = (e as Error & { code?: string }).code;
          setError(f.errors[code as keyof typeof f.errors] ?? f.errors.generic);
        },
      },
    );
  }

  const next = TRANSITIONS[status].filter((s) => s !== "discarded");
  const label = (to: QuoteStatus) => (status === "discarded" ? f.actions.reopen : f.actions[to as "contacted" | "confirmed" | "approved"]);
  const canDiscard = TRANSITIONS[status].includes("discarded");

  return (
    <section className="panel" aria-labelledby={`flow-${id}`}>
      <h2 id={`flow-${id}`} className="panel__title">{f.title}</h2>
      <p className="panel__meta"><Badge variant={variant(status)}>{q.statuses[status]}</Badge> {q.hints[status]}</p>
      {(next.length > 0 || canDiscard) && (
        <div className="flow">
          <div className="field">
            <label htmlFor={`note-${id}`}>{discarding ? f.discardNote : f.note}</label>
            <Textarea id={`note-${id}`} value={note} maxLength={500} rows={3} placeholder={discarding ? f.discardPlaceholder : f.notePlaceholder} aria-invalid={Boolean(error) && discarding} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flow__actions">
            {next.map((to) => (
              <Button key={to} type="button" disabled={set.isPending} variant={to === "approved" ? "default" : "outline"} onClick={() => go(to)}>{label(to)}</Button>
            ))}
            {canDiscard && (
              discarding
                ? <Button type="button" variant="outline" disabled={set.isPending} onClick={() => go("discarded")}>{f.actions.discarded}</Button>
                : <Button type="button" variant="outline" disabled={set.isPending} onClick={() => setDiscarding(true)}>{f.actions.discarded}…</Button>
            )}
          </div>
          {next.includes("approved") && <p className="wiz__hint">{f.confirmApprove}</p>}
          {error && <p className="field-error" role="alert">{error}</p>}
        </div>
      )}
      <h3 className="flow__h">{f.history}</h3>
      {events.length === 0 ? <p className="panel__meta">{f.noHistory}</p> : (
        <ol className="flow__log">
          {events.map((e) => (
            <li key={e.id}>
              <strong>{e.subject === "fulfillment" ? q.fulfillment.changedTitle : e.subject === "team" ? q.fulfillment.teamChangedTitle : e.subject === "share" ? q.share.eventShare : e.subject === "notice" ? q.share.eventNotice : e.subject === "portal" ? q.share.eventPortal : e.subject === "note" ? t.app.crm.panel.eventNote : e.subject === "source" ? t.app.crm.panel.eventSource : e.subject === "lead" ? t.app.crm.panel.eventLead : e.subject === "client_decision" ? q.share.eventDecision : e.kitChange ? q.edit.changed : q.statuses[e.to]}</strong> <span>{date.format(new Date(e.at))} · {f.by} {e.by}</span>
              {e.subject === "notice" && e.note
                ? <p className="flow__changes">{noticeNote(e.note, q.share)}</p>
                : e.subject === "client_decision" && e.note
                ? <p className="flow__changes">{decisionNote(e.note, q.share)}</p>
                : e.note && e.subject !== "share" && e.subject !== "portal" && e.subject !== "source" && e.subject !== "lead" && <p className={e.kitChange || e.subject ? "flow__changes" : undefined}>{e.subject === "fulfillment" ? fulfillmentNote(e.note, q.fulfillment) : e.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Enlace público para el cliente + PDF. El token solo existe en la respuesta de «generar»: se queda en memoria hasta salir de la página. */
function SharePanel({ t, lang, r }: { t: Dict; lang: Locale; r: { id: string; status: QuoteStatus; lang: "es" | "en"; contactName: string; contactPhone: string; share: { expiresAt: string | null; decision: "accepted" | "declined" | null; decidedAt: string | null; note: string | null } } }) {
  const q = t.app.quotes;
  const s = q.share;
  const create = useShareQuote();
  const confirm = useConfirm();
  const mail = useEmailQuoteLink();
  const [mailResult, setMailResult] = useState<NoticeOutcome | "error" | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const date = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" });
  const confirmed = r.status === "confirmed";
  const active = r.share.expiresAt != null && new Date(r.share.expiresAt).getTime() > Date.now();

  async function generate() {
    // Con un enlace ya generado, uno nuevo invalida el anterior y borra la respuesta del cliente.
    if ((active || url) && !(await confirm({ message: s.regenerateConfirm, confirmLabel: s.regenerate }))) return;
    setError("");
    setCopied(false);
    setMailResult(null);
    create.mutate({ id: r.id }, { onSuccess: (d) => setUrl(d.url), onError: () => setError(s.error) });
  }
  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
  }
  function sendEmail() {
    if (!url) return;
    setMailResult(null);
    mail.mutate({ id: r.id, url }, { onSuccess: (d) => setMailResult(d.outcome ?? "failed"), onError: () => setMailResult("error") });
  }
  const wa = url ? whatsappShareUrl(r.contactPhone, shareMessage({ name: r.contactName, url, lang: r.lang })) : null;

  return (
    <section className="panel" aria-labelledby={`share-${r.id}`}>
      <h2 id={`share-${r.id}`} className="panel__title">{s.title}</h2>
      <p className="panel__meta">{s.hint}</p>
      {r.share.decision && (
        <p role="status">
          <Badge variant={r.share.decision === "accepted" ? "default" : "secondary"}>{s.decisions[r.share.decision]}</Badge>{" "}
          {r.share.decidedAt && <>{s.decisionAt} {date.format(new Date(r.share.decidedAt))}</>}
          {r.share.note && <span className="tbl__sub">{r.share.note}</span>}
          {r.share.decision === "accepted" && r.status === "confirmed" && <span className="tbl__sub">{s.acceptedHint}</span>}
        </p>
      )}
      <div className="flow__actions">
        <Button asChild variant="outline"><a href={`/api/quotes/${r.id}/pdf?lang=${lang}`}><Download aria-hidden="true" />{s.pdf}</a></Button>
        {confirmed && <Button type="button" disabled={create.isPending} onClick={generate}>{active || url ? s.regenerate : s.generate}</Button>}
      </div>
      {!confirmed && <p className="wiz__hint">{s.lockedHint}</p>}
      {confirmed && (active || url) && !url && <p className="wiz__hint">{s.active} {r.share.expiresAt && date.format(new Date(r.share.expiresAt))}. {s.regenerateHint}</p>}
      {confirmed && !active && !url && <p className="wiz__hint">{s.none}</p>}
      {url && (
        <div className="flow">
          <div className="field">
            <label htmlFor={`share-url-${r.id}`}>{s.title}</label>
            <Input id={`share-url-${r.id}`} readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
          </div>
          <div className="flow__actions">
            <Button type="button" variant="outline" onClick={copy}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? s.copied : s.copy}</Button>
            <Button type="button" variant="outline" disabled={mail.isPending} onClick={sendEmail}><Mail aria-hidden="true" />{mail.isPending ? s.emailSending : s.email}</Button>
            {wa && <Button asChild variant="outline"><a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" />{s.whatsapp}</a></Button>}
          </div>
          {mailResult && <p role="status" className={mailResult === "sent" ? "wiz__hint" : "field-error"}>{s.emailResult[mailResult === "error" ? "failed" : mailResult]}</p>}
          <p className="wiz__hint">{s.onlyOnce}</p>
        </div>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
    </section>
  );
}

/** Equipo que hará la visita y la instalación: se elige entre los activos, ordenados por cercanía a la obra. */
function TeamControl({ t, lang, r }: { t: Dict; lang: Locale; r: { id: string; status: QuoteStatus; bill: { lat?: number | null; lon?: number | null }; team: { id: string; name: string } | null } }) {
  const f = t.app.quotes.fulfillment;
  const teams = useTeams();
  const set = useSetQuoteTeam();
  const [error, setError] = useState("");
  const editable = kitEditable(r.status);
  if (!editable) return <>{r.team ? <Link href={`/${lang}/app/teams/${r.team.id}`}>{r.team.name}</Link> : f.noTeam}</>;
  const here = r.bill.lat != null && r.bill.lon != null ? { lat: r.bill.lat, lon: r.bill.lon } : null;
  const options = (teams.data ?? [])
    .filter((x) => x.active || x.id === r.team?.id)
    .map((x) => ({ x, km: here ? Math.round(distanceKm(x, here)) : null }))
    .sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
  const NONE = "none";
  return (
    <span className="ful">
      <Select value={r.team?.id ?? NONE} onValueChange={(v) => { setError(""); set.mutate({ id: r.id, teamId: v === NONE ? null : v }, { onError: () => setError(f.error) }); }} disabled={set.isPending || teams.isPending}>
        <SelectTrigger size="sm" aria-label={f.team}><SelectValue placeholder={f.noTeam} /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{f.noTeam}</SelectItem>
          {options.map(({ x, km }) => (
            <SelectItem key={x.id} value={x.id}>
              {x.name} · {x.city}{km != null ? ` · ${km} km` : ""}{km != null && km > x.radiusKm ? ` · ${f.outOfRange}` : ""}{x.maxActive != null && x.load >= x.maxActive ? ` · ${f.teamFull}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <small className="field-error" role="alert">{error}</small>}
    </span>
  );
}

function FulfillmentControl({ t, r }: { t: Dict; r: { id: string; status: QuoteStatus; fulfillment: "install" | "kit_only" | "unknown"; distanceKm: number | null } }) {
  const f = t.app.quotes.fulfillment;
  const set = useSetFulfillment();
  const [error, setError] = useState("");
  const editable = kitEditable(r.status);
  const label = `${f[r.fulfillment]}${r.distanceKm != null ? ` · ${r.distanceKm} km` : ""}`;
  if (!editable) return <>{label}</>;
  return (
    <span className="ful">
      <Select value={r.fulfillment === "unknown" ? "" : r.fulfillment} onValueChange={(v) => { setError(""); set.mutate({ id: r.id, fulfillment: v as "install" | "kit_only" }, { onError: () => setError(f.error) }); }} disabled={set.isPending}>
        <SelectTrigger size="sm" aria-label={f.label}><SelectValue placeholder={f.unknown} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="install">{f.install}</SelectItem>
          <SelectItem value="kit_only">{f.kit_only}</SelectItem>
        </SelectContent>
      </Select>
      {r.distanceKm != null && <small>{r.distanceKm} km</small>}
      {error && <small className="field-error" role="alert">{error}</small>}
    </span>
  );
}

export function QuotesList({ t, lang }: { t: Dict; lang: Locale }) {
  const q = t.app.quotes;
  const date = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" });
  const [filter, setFilter] = useState<"all" | QuoteStatus>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const { data, isPending, isError, refetch } = useQuotes({ status: filter, page, pageSize });
  const shown = data?.items ?? [];
  const count = (s: "all" | QuoteStatus) => data?.counts[s] ?? 0;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  // Si al cambiar de estado (o aprobar/descartar una solicitud) la página actual ya no existe, vuelve a la última.
  useEffect(() => {
    if (data && data.total > 0 && page > pages) setPage(pages);
  }, [data, page, pages]);
  return (
    <div className="pb">
      <header className="ph">
        <div>
          <h1 className="ph__title">{q.title}</h1>
          <p className="ph__sub">{q.sub}</p>
        </div>
      </header>
      {isPending ? (
        <Loading label={q.loading} variant="table" cols={6} />
      ) : isError ? (
        <p role="alert">{q.loadError} <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>{q.retry}</Button></p>
      ) : data.counts.all === 0 ? (
        <EmptyState icon={FileText} title={t.app.empty.quotes.title} description={t.app.empty.quotes.desc}>
          <Button asChild variant="outline"><Link href={`/${lang}/simulator`} target="_blank">{t.app.empty.quotes.action}</Link></Button>
        </EmptyState>
      ) : (
        <>
        <Tabs value={filter} onValueChange={(v) => { setFilter(v as "all" | QuoteStatus); setPage(1); }}>
          <TabsList aria-label={q.status} className="h-auto flex-wrap bg-(--mist) p-1">
            {(["all", ...QUOTE_STATUSES] as const).map((s) => (
              <TabsTrigger key={s} value={s} className="px-3 py-2 text-[0.88rem] font-bold text-(--ink-soft) hover:text-(--ink) data-[state=active]:bg-white data-[state=active]:text-(--ink) data-[state=active]:shadow-sm">
                {s === "all" ? q.filterAll : q.statuses[s]} <span className="tbl__sub" style={{ display: "inline", marginLeft: 4 }}>{count(s)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">{q.client}</th>
                <th scope="col">{q.system}</th>
                <th scope="col" className="num">{q.items}</th>
                <th scope="col" className="num">{q.total}</th>
                <th scope="col">{q.date}</th>
                <th scope="col">{q.status}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <th scope="row">
                    <Link href={`/${lang}/app/quotes/${r.id}`}>{r.contactName}</Link>
                    {r.city && <span className="tbl__sub">{r.city}</span>}
                    {r.fulfillment === "kit_only" && <Badge variant="warning">{q.fulfillment.kit_only}</Badge>}
                  </th>
                  <td>{q[r.systemType]}</td>
                  <td className="num">{r.itemCount}</td>
                  <td className="num"><strong>{money(lang, r.total, r.currency)}</strong></td>
                  <td>{date.format(new Date(r.createdAt))}</td>
                  <td><Badge variant={variant(r.status)}>{q.statuses[r.status]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.total > 0 && (
          <DataPagination
            page={Math.min(page, pages)}
            pages={pages}
            total={data.total}
            pageSize={pageSize}
            pageSizes={PAGE_SIZES}
            lang={lang}
            labels={{ ...t.app.pager, pageOf: q.pageOf, nav: q.title }}
            onPageChange={setPage}
            onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          />
        )}
        </>
      )}
    </div>
  );
}

export function QuoteDetailView({ t, lang, id }: { t: Dict; lang: Locale; id: string }) {
  const q = t.app.quotes;
  const { data: r, isPending, isError } = useQuote(id);
  const back = <Link href={`/${lang}/app/quotes`} className="back">← {q.back}</Link>;
  if (isPending) return <div className="pb">{back}<Loading label={q.loading} variant="detail" /></div>;
  if (isError || !r) return <div className="pb">{back}<p role="alert">{q.notFound}</p></div>;
  const rows: [string, string][] = [
    [q.monthlyKwh, `${num(lang, r.bill.monthlyKwh)} kWh`],
    [q.tariff, r.bill.tariff == null ? "—" : `${money(lang, r.bill.tariff, r.currency, 2)} / kWh`],
    [q.operator, r.bill.operator ?? "—"],
    [q.city, [r.bill.municipality, r.bill.department].filter(Boolean).join(", ") || "—"],
    [q.connection, r.bill.connection ? (t.wiz.review.connections[r.bill.connection as keyof typeof t.wiz.review.connections] ?? r.bill.connection) : "—"],
    [q.coverage, `${r.bill.coveragePct} %`],
    [q.sun, String(r.bill.peakSunHours)],
    ...(r.bill.backupKw ? ([[q.backup, `${r.bill.backupKw} kW · ${r.bill.autonomyHours} h`]] as [string, string][]) : []),
  ];
  return (
    <div className="pb">
      {back}
      <header className="ph">
        <div>
          <h1 className="ph__title">{r.contactName}</h1>
          <p className="ph__sub">
            {q[r.systemType]} · {new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(new Date(r.createdAt))}{" "}
            <Badge variant={r.fulfillment === "kit_only" ? "warning" : r.fulfillment === "install" ? "default" : "outline"}>{q.fulfillment[r.fulfillment]}</Badge>
          </p>
        </div>
      </header>

      <QuoteSteps t={t} lang={lang} status={r.status} projectId={r.projectId} fulfillment={r.fulfillment} />
      <FlowPanel t={t} lang={lang} id={r.id} status={r.status} events={r.events} />
      <SharePanel t={t} lang={lang} r={r} />
      <QuoteCrmPanel t={t} lang={lang} r={r} />

      <div className="two two--wide two--quote">
        <section className="panel">
          <h2 className="panel__title">{q.contact}</h2>
          <dl className="pspecs">
            <div><dt>{q.email}</dt><dd><a href={`mailto:${r.contactEmail}`}>{r.contactEmail}</a></dd></div>
            <div><dt>{q.phone}</dt><dd>{whatsappUrl(r.contactPhone) ? <a href={whatsappUrl(r.contactPhone)!} target="_blank" rel="noopener noreferrer" aria-label={`${q.whatsapp}: ${formatPhone(r.contactPhone)}`}>{formatPhone(r.contactPhone)}</a> : <a href={`tel:${r.contactPhone}`}>{r.contactPhone}</a>}</dd></div>
            <div><dt>{q.city}</dt><dd>{r.city ?? "—"}</dd></div>
            <div><dt>{q.fulfillment.label}</dt><dd><FulfillmentControl t={t} r={r} /></dd></div>
            {r.installerChoice && <div><dt>{q.fulfillment.choice}</dt><dd>{q.fulfillment.choices[r.installerChoice]}</dd></div>}
            {r.fulfillment !== "kit_only" && <div><dt>{q.fulfillment.team}</dt><dd><TeamControl t={t} lang={lang} r={r} /></dd></div>}
            {r.fulfillment !== "kit_only" && r.team && <div><dt>{q.fulfillment.installFee}</dt><dd>{r.installFee == null ? q.fulfillment.noFee : money(lang, r.installFee, r.currency)}</dd></div>}
          </dl>
          {r.financing && (
            <>
              <h2 className="panel__title">{q.financing.title}</h2>
              <dl className="pspecs">
                <div><dt>{q.financing.monthly}</dt><dd>{money(lang, r.financing.monthly, r.currency)} × {r.financing.termMonths}</dd></div>
                <div><dt>{q.financing.down}</dt><dd>{r.financing.downPct} % · {money(lang, r.financing.down, r.currency)}</dd></div>
                <div><dt>{q.financing.financed}</dt><dd>{money(lang, r.financing.financed, r.currency)}</dd></div>
                <div><dt>{q.financing.rate}</dt><dd>{r.financing.rateEA.toLocaleString(lang, { maximumFractionDigits: 2 })} % EA{r.financing.entity ? ` · ${q.financing.reference} ${r.financing.entity}` : ""}</dd></div>
                <div><dt>{q.financing.totalPaid}</dt><dd>{money(lang, r.financing.totalPaid, r.currency)}</dd></div>
              </dl>
              <p className="wiz__hint">{q.financing.note}</p>
            </>
          )}
          <h2 className="panel__title">{q.data}</h2>
          <dl className="pspecs">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          <h2 className="panel__title">{q.sizing}</h2>
          <dl className="pspecs">
            <div><dt>{q.kwp}</dt><dd>{r.sizing.kwp} kWp</dd></div>
            <div><dt>{q.generation}</dt><dd>{num(lang, Math.round(r.sizing.monthlySolarKwh))} kWh</dd></div>
            {r.sizing.monthlySavings != null && <div><dt>{q.savings}</dt><dd>{money(lang, r.sizing.monthlySavings, r.currency)}</dd></div>}
            {r.sizing.batteryNominalKwh > 0 && <div><dt>{q.battery}</dt><dd>{r.sizing.batteryNominalKwh} kWh</dd></div>}
          </dl>
        </section>

        <QuoteKitSection t={t} lang={lang} r={r} />
      </div>
    </div>
  );
}

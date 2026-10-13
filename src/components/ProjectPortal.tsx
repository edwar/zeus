import { Check, Download, ExternalLink } from "lucide-react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fill, money, num } from "@/lib/format";
import type { PortalView } from "@/lib/portal";
import { buttonVariants } from "@/components/ui/button";

const STEPS = ["visit", "design", "install", "monitor"] as const;

const day = (lang: Locale, iso: string) => new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
const span = (lang: Locale, from: string, to: string) => (from === to ? day(lang, from) : `${day(lang, from)} → ${day(lang, to)}`);

/** Portal del cliente: avance de su proyecto en solo lectura. Solo muestra lo que `findPortalProject` entrega (lista blanca). */
export function ProjectPortal({ t, lang, urlRef, view: v }: { t: Dict; lang: Locale; urlRef: string; view: PortalView }) {
  const p = t.portal;
  const cur = STEPS.indexOf(v.stage as (typeof STEPS)[number]); // un proyecto sin etapa de cliente (p. ej. "lead") no marca ninguna
  const done = v.milestones.filter((m) => m.state === "done").length;
  const next = v.milestones.find((m) => m.state !== "done");
  const e = v.estimate;
  const approved = v.approvedAt ? new Intl.DateTimeFormat(lang, { dateStyle: "long", timeZone: "America/Bogota" }).format(new Date(v.approvedAt)) : null;

  return (
    <div className="wrap pdetail qlink portal">
      <header className="qlink__head">
        <p className="qlink__eyebrow">{p.eyebrow} · {v.ref}</p>
        <h1 className="qlink__title">{fill(p.hello, { name: v.client })}</h1>
        <p className="qlink__lead">{p.intro}</p>
      </header>

      <section className="panel" aria-labelledby="pt-stage">
        <h2 id="pt-stage" className="panel__title">{p.track}</h2>
        <ol className="track" aria-label={p.track}>
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === cur ? "step" : undefined} className={i < cur ? "is-done" : i === cur ? "is-cur" : ""}>
              <span>{p.stages[s]}</span>
            </li>
          ))}
        </ol>
        {cur >= 0 && <p><strong>{p.now}: {p.stages[STEPS[cur]]}.</strong> {p.stageText[STEPS[cur]]}</p>}
      </section>

      <section className="panel prog" aria-labelledby="pt-progress">
        <div className="prog__top">
          <h2 id="pt-progress" className="panel__title">{p.progress.title}</h2>
          {v.milestones.length > 0 && <strong className="prog__pct">{v.overall} %</strong>}
        </div>
        {v.milestones.length === 0 ? (
          <p className="panel__meta">{p.progress.none}</p>
        ) : (
          <>
            <div className="prog__bar">
              <span>{fill(p.progress.doneOf, { done, total: v.milestones.length })}</span>
              <div className="meter" role="img" aria-label={`${v.overall} %`}><i className="meter--emerald" style={{ width: `${v.overall}%` }} /></div>
            </div>
            {next && (
              <div className="prog__next">
                <span>{p.progress.next}</span>
                <strong>{next.label}</strong>
                <small>{span(lang, next.start, next.end)}</small>
              </div>
            )}
            <ul className="prog__list">
              {v.milestones.map((m) => (
                <li key={m.id} className={`prog__item prog__item--${m.state}`}>
                  <span className="prog__dot" aria-hidden="true">{m.state === "done" ? "✓" : ""}</span>
                  <span className="prog__name">{m.label}<small>{span(lang, m.start, m.end)}</small></span>
                  <span className="prog__state">{p.progress.state[m.state]}{m.state !== "done" && m.done > 0 ? ` · ${m.done} %` : ""}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="panel" aria-labelledby="pt-sys">
        <h2 id="pt-sys" className="panel__title">{p.summary.title}</h2>
        <dl className="pspecs">
          <div><dt>{p.summary.power}</dt><dd>{v.kwp} kWp</dd></div>
          <div><dt>{p.summary.place}</dt><dd>{v.town}</dd></div>
          <div><dt>{p.summary.ref}</dt><dd>{v.ref}</dd></div>
          {approved && <div><dt>{p.summary.approved}</dt><dd>{approved}</dd></div>}
        </dl>
      </section>

      {v.materials.total > 0 && (
        <section className="panel" aria-labelledby="pt-mat">
          <h2 id="pt-mat" className="panel__title">{p.materials.title}</h2>
          <div className="prog__bar">
            <span>{fill(p.materials.ready, { ready: v.materials.ready, total: v.materials.total })}</span>
            <div className="meter" role="img" aria-label={fill(p.materials.ready, { ready: v.materials.ready, total: v.materials.total })}><i className="meter--emerald" style={{ width: `${(v.materials.ready / v.materials.total) * 100}%` }} /></div>
          </div>
          <ul className="portal__mats">
            {v.materials.items.map((m) => (
              <li key={m.id} className={m.ready ? "is-ready" : undefined}>
                <span aria-hidden="true">{m.ready ? <Check /> : null}</span>
                {m.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel" aria-labelledby="pt-prod">
        <h2 id="pt-prod" className="panel__title">{p.production.title}</h2>
        <dl className="pspecs">
          {e.monthlyKwh != null && <div><dt>{p.production.monthly}</dt><dd>{num(lang, Math.round(e.monthlyKwh))} kWh</dd></div>}
          {e.monthlySavings != null && <div><dt>{p.production.savings}</dt><dd>{money(lang, e.monthlySavings, e.currency)}</dd></div>}
        </dl>
        <p className="wiz__hint">{p.production.note}</p>
        {v.monitorUrl ? (
          <a className={buttonVariants({ variant: "outline" }) + " qlink__pdf"} href={v.monitorUrl} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" />{p.production.open}</a>
        ) : (
          <p className="panel__meta">{p.production.soon}</p>
        )}
      </section>

      <section className="panel" aria-labelledby="pt-docs">
        <h2 id="pt-docs" className="panel__title">{p.docs.title}</h2>
        <div className="portal__docs">
          <a className={buttonVariants({ variant: "outline" }) + " qlink__pdf"} href={`/api/p/${urlRef}/quote-pdf?lang=${lang}`}><Download aria-hidden="true" />{p.docs.quote}</a>
          {v.handover && <a className={buttonVariants({ variant: "outline" }) + " qlink__pdf"} href={`/api/p/${urlRef}/acta?lang=${lang}`}><Download aria-hidden="true" />{p.docs.acta}</a>}
          {v.documents.map((x) => (
            <a key={x.id} className={buttonVariants({ variant: "outline" }) + " qlink__pdf"} href={`/api/p/${urlRef}/docs/${x.id}`}><Download aria-hidden="true" />{x.title} <small>({p.docs.kinds[x.kind as keyof typeof p.docs.kinds] ?? p.docs.kinds.other})</small></a>
          ))}
        </div>
      </section>

      <p className="wiz__hint">{p.help}</p>
    </div>
  );
}

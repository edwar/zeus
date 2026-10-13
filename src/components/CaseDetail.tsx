import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fill, money } from "@/lib/format";
import { pick } from "@/lib/cases";
import type { PublicCase } from "@/lib/cases-data";
import { Button } from "@/components/ui/button";

const day = (lang: Locale, iso: string) => new Intl.DateTimeFormat(lang, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** Ficha pública de un caso: el resultado, cómo se verificó y quién lo autorizó (el cliente aparece como él decidió). */
export function CaseDetail({ t, lang, c }: { t: Dict; lang: Locale; c: PublicCase }) {
  const k = t.cases;
  const title = pick(lang, c.titleEs, c.titleEn);
  const quote = pick(lang, c.quoteEs, c.quoteEn);
  const place = [c.town, c.department].filter(Boolean).join(", ");
  const month = new Intl.DateTimeFormat(lang, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${c.installedOn}T00:00:00Z`));
  return (
    <article className="wrap pdetail case">
      <Link href={`/${lang}/cases`} className="back">← {k.back}</Link>
      <header className="case__head">
        <p className="cases__eyebrow">{k.audiences[c.audience]} · {place}</p>
        <h1 className="case__title">{title}</h1>
        <p className="lead">{pick(lang, c.summaryEs, c.summaryEn)}</p>
      </header>

      <section className="panel case__results" aria-labelledby="case-res">
        <h2 id="case-res" className="panel__title">{k.results}</h2>
        <p className="case__big">{fill(k.saves, { pct: c.savingsPct })}</p>
        <p>{fill(k.savesAmount, { amount: money(lang, c.savingsAmount, c.currency) })}</p>
        <dl className="pspecs">
          <div><dt>{k.billBefore}</dt><dd>{money(lang, c.billBefore, c.currency)}</dd></div>
          <div><dt>{k.billAfter}</dt><dd>{money(lang, c.billAfter, c.currency)}</dd></div>
          <div><dt>{k.kwp}</dt><dd>{c.kwp} kWp · {k.systems[c.systemType as keyof typeof k.systems]}</dd></div>
          <div><dt>{k.installed}</dt><dd>{month}</dd></div>
          <div><dt>{k.where}</dt><dd>{place}</dd></div>
        </dl>
      </section>

      {quote && (
        <blockquote className="case__quote">
          <p>«{quote}»</p>
          <footer>— {c.displayName}, {c.town}</footer>
        </blockquote>
      )}

      <section className="case__verified" aria-labelledby="case-ver">
        <h2 id="case-ver"><BadgeCheck aria-hidden="true" /> {k.verified}</h2>
        <p><strong>{fill(k.verifiedOn, { date: day(lang, c.verifiedOn) })}.</strong> {k.how}: {c.evidence}</p>
      </section>

      {c.photos.length > 0 && (
        <section aria-labelledby="case-photos">
          <h2 id="case-photos" className="panel__title">{k.photos}</h2>
          <ul className="case__gallery">
            {c.photos.map((p) => (
              <li key={p.url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={fill(k.photoAlt, { title })} loading="lazy" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="cases__note">{k.disclaimer}</p>
      <section className="panel case__cta">
        <h2 className="panel__title">{k.ctaTitle}</h2>
        <p>{k.ctaText}</p>
        <Button asChild><Link href={`/${lang}/simulator`}>{k.cta}</Link></Button>
      </section>
    </article>
  );
}

import Link from "next/link";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fill, money } from "@/lib/format";
import { pick } from "@/lib/cases";
import type { PublicCase } from "@/lib/cases-data";
import { SunBurst } from "@/components/Scenes";

/** Tarjeta de un caso publicado: foto (o el sol de la marca), qué logró y de dónde es. */
export function CaseCard({ t, lang, c }: { t: Dict; lang: Locale; c: PublicCase }) {
  const k = t.cases;
  const title = pick(lang, c.titleEs, c.titleEn);
  const photo = c.photos[0];
  return (
    <li className="casecard">
      <Link href={`/${lang}/cases/${c.slug}`} className="casecard__link" aria-label={`${k.read}: ${title}`}>
        <span className="casecard__media" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photo ? <img src={photo.url} alt="" loading="lazy" /> : <SunBurst className="casecard__sun" />}
        </span>
        <span className="casecard__body">
          <span className="casecard__tag">{k.audiences[c.audience]} · {c.town}</span>
          <strong className="casecard__title">{title}</strong>
          <span className="casecard__saves">{fill(k.saves, { pct: c.savingsPct })}</span>
          <span className="casecard__bills">{money(lang, c.billBefore, c.currency)} → {money(lang, c.billAfter, c.currency)} · {c.kwp} kWp</span>
        </span>
      </Link>
    </li>
  );
}

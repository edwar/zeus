import Link from "next/link";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { PublicCase } from "@/lib/cases-data";
import { CaseCard } from "@/components/CaseCard";
import { Button } from "@/components/ui/button";

/** Casos reales en la landing. Sin casos publicados no se pinta nada: nunca se rellena con ejemplos inventados. */
export function CasesSection({ t, lang, cases }: { t: Dict; lang: Locale; cases: PublicCase[] }) {
  if (cases.length === 0) return null;
  const k = t.cases;
  const shown = cases.slice(0, 3);
  return (
    <section id="casos" className="slab slab--white cases" aria-labelledby="cases-h">
      <div className="wrap">
        <div className="sec__head">
          <p className="cases__eyebrow">{k.eyebrow}</p>
          <h2 id="cases-h" className="h2">{k.title}</h2>
          <p className="lead">{k.sub}</p>
        </div>
        <ul className="casecards">{shown.map((c) => <CaseCard key={c.slug} t={t} lang={lang} c={c} />)}</ul>
        <p className="cases__note">{k.disclaimer}</p>
        {cases.length > shown.length && <Button asChild variant="outline"><Link href={`/${lang}/cases`}>{k.all}</Link></Button>}
      </div>
    </section>
  );
}

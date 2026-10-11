import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { LatticeHero } from "@/components/LatticeHero";
import { Button } from "@/components/ui/button";
import { absoluteUrl, jsonLd } from "@/lib/site";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDict(lang);
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: t.brand,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/icon-512.png"),
      description: t.meta.orgDescription,
      areaServed: "CO",
    },
    { "@context": "https://schema.org", "@type": "WebSite", name: t.brand, url: absoluteUrl(`/${lang}`), inLanguage: lang },
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <section className="hero">
        <div className="wrap hero__grid">
          <div className="hero__copy">
            <h1 className="hero__title">{t.hero.title}</h1>
            <p className="hero__sub">{t.hero.sub}</p>
            <div className="hero__cta">
              <Button asChild variant="sun"><Link href={`/${lang}/simulator`}>{t.hero.primary}</Link></Button>
              <Button asChild variant="outline-dark"><Link href={`/${lang}/products`}>{t.hero.secondary}</Link></Button>
            </div>
          </div>
          <LatticeHero t={t.hero} />
        </div>
      </section>

      <section className="sec sec--light on-light" aria-labelledby="process-h">
        <div className="wrap">
          <div className="sec__head">
            <h2 id="process-h" className="h2">{t.process.title}</h2>
            <p className="lead">{t.process.sub}</p>
          </div>
          <ol className="steps">
            {t.process.steps.map((s, i) => (
              <li key={s.name} className="steps__item" style={{ ["--i" as string]: i }}>
                <h3 className="steps__name">{s.name}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sec sec--dark" aria-labelledby="dom-h">
        <div className="wrap dom">
          <div>
            <h2 id="dom-h" className="h2 h2--dark">{t.domotics.title}</h2>
            <p className="lead lead--dark">{t.domotics.text}</p>
          </div>
          <ul className="dom__list">
            {t.domotics.items.map((i) => (
              <li key={i.name}>
                <h3>{i.name}</h3>
                <p>{i.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sec sec--light on-light" aria-labelledby="aud-h">
        <div className="wrap">
          <h2 id="aud-h" className="h2">{t.audiences.title}</h2>
          <div className="aud">
            {t.audiences.items.map((a, i) => (
              <div key={a.name} className={`aud__col aud__col--${i}`}>
                <h3>{a.name}</h3>
                <p>{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

<section className="closer">
        <div className="wrap closer__in">
          <h2 className="closer__title">{t.close.title}</h2>
          <p>{t.close.text}</p>
          <Button asChild variant="sun" className="bg-canopy-deep text-sun hover:bg-canopy"><Link href={`/${lang}/simulator`}>{t.close.cta}</Link></Button>
        </div>
      </section>
    </>
  );
}

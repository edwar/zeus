import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { SolarDay } from "@/components/SolarDay";
import { DomIcon, HouseArt, ShopArt, SunBurst, VillageArt } from "@/components/Scenes";
import { Button } from "@/components/ui/button";
import { absoluteUrl, jsonLd } from "@/lib/site";
import { getPublishedCases } from "@/lib/cases-data";
import { CasesSection } from "@/components/CasesSection";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDict(lang);
  // Casos reales publicados (con autorización y ahorro verificado). Sin ninguno, la sección no se pinta.
  const cases = await getPublishedCases().catch(() => []);
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
        <SunBurst className="hero__sun" />
        <div className="wrap hero__grid">
          <div className="hero__copy">
            <h1 className="hero__title">{t.hero.title}</h1>
            <p className="hero__sub">{t.hero.sub}</p>
            <div className="hero__cta">
              <Button asChild variant="ink"><Link href={`/${lang}/simulator`}>{t.hero.primary}</Link></Button>
              <Button asChild variant="outline"><Link href={`/${lang}/products`}>{t.hero.secondary}</Link></Button>
            </div>
          </div>
          <SolarDay t={t.hero} />
        </div>
      </section>

      <section className="slab slab--white" aria-labelledby="process-h">
        <div className="wrap">
          <div className="sec__head">
            <h2 id="process-h" className="h2">{t.process.title}</h2>
            <p className="lead">{t.process.sub}</p>
          </div>
          <ol className="steps">
            {t.process.steps.map((s, i) => (
              <li key={s.name} className="steps__item" style={{ ["--i" as string]: i }}>
                <span className="steps__dot" aria-hidden="true">{i + 1}</span>
                <h3 className="steps__name">{s.name}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="guia" className="slab slab--paper guide" aria-labelledby="guide-h">
        <div className="wrap">
          <div className="sec__head">
            <h2 id="guide-h" className="h2">{t.guide.title}</h2>
            <p className="lead">{t.guide.sub}</p>
          </div>
          <ol className="guide__list">
            {t.guide.steps.map((s, i) => (
              <li key={s.name} className="guide__step">
                <span className="guide__num" aria-hidden="true">{i + 1}</span>
                <h3 className="guide__name">{s.name}</h3>
                <div className="guide__cols">
                  <div>
                    <h4>{t.guide.you}</h4>
                    <ul>{s.you.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                  <div>
                    <h4>{t.guide.we}</h4>
                    <ul>{s.we.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                </div>
                <p className="guide__get"><strong>{t.guide.get}:</strong> {s.get}</p>
              </li>
            ))}
          </ol>
          <h3 className="guide__faqtitle">{t.guide.faqTitle}</h3>
          <div className="guide__faq">
            {t.guide.faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="slab slab--sky" aria-labelledby="dom-h">
        <div className="wrap dom">
          <div className="dom__intro">
            <h2 id="dom-h" className="h2 h2--dark">{t.domotics.title}</h2>
            <p className="lead lead--dark">{t.domotics.text}</p>
          </div>
          <ul className="dom__list">
            {t.domotics.items.map((i, k) => (
              <li key={i.name}>
                <DomIcon index={k} className="dom__icon" />
                <h3>{i.name}</h3>
                <p>{i.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="slab slab--white" aria-labelledby="aud-h">
        <div className="wrap">
          <h2 id="aud-h" className="h2">{t.audiences.title}</h2>
          <div className="aud">
            {t.audiences.items.map((a, i) => (
              <div key={a.name} className={`aud__col aud__col--${i}`}>
                <div className="aud__text">
                  <h3>{a.name}</h3>
                  <p>{a.text}</p>
                </div>
                {i === 0 && <HouseArt className="aud__art" />}
                {i === 1 && <ShopArt className="aud__art" />}
                {i === 2 && <VillageArt className="aud__art" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <CasesSection t={t} lang={lang} cases={cases} />

      <section className="slab slab--lima closer">
        <SunBurst className="closer__sun" />
        <div className="wrap closer__in">
          <h2 className="closer__title">{t.close.title}</h2>
          <p>{t.close.text}</p>
          <Button asChild variant="ink"><Link href={`/${lang}/simulator`}>{t.close.cta}</Link></Button>
        </div>
      </section>
    </>
  );
}

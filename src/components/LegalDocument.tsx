import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { fill } from "@/lib/format";
import { LEGAL, PENDING, legalVars } from "@/lib/legal/config";
import type { Block, LegalDoc } from "@/lib/legal/types";

// Texto en línea: rellena los datos del responsable, convierte [texto](/ruta) en enlaces y resalta lo que sigue pendiente.
const TOKEN = /(\[[^\]]+\]\([^)]+\)|\[POR COMPLETAR[^\]]*\])/g;

function Inline({ text, lang }: { text: string; lang: Locale }) {
  const filled = fill(text, legalVars());
  return (
    <>
      {filled.split(TOKEN).map((part, i) => {
        if (part.startsWith(PENDING)) return <mark key={i} className="legal__pending">{part}</mark>;
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (!link) return part;
        const [, label, href] = link;
        // /privacy → /es/privacy; los archivos y anclas (/.well-known/…) se dejan tal cual.
        if (href.startsWith("/.")) return <a key={i} href={href}>{label}</a>;
        return <Link key={i} href={href.startsWith("/") ? `/${lang}${href}` : href}>{label}</Link>;
      })}
    </>
  );
}

function BlockView({ block, lang }: { block: Block; lang: Locale }) {
  if (typeof block === "string") return <p><Inline text={block} lang={lang} /></p>;
  if ("list" in block) return <ul>{block.list.map((li, i) => <li key={i}><Inline text={li} lang={lang} /></li>)}</ul>;
  if ("note" in block) return <p className="legal__note"><Inline text={block.note} lang={lang} /></p>;
  return (
    <div className="legal__table" role="region" tabIndex={0} aria-label={block.table.head.join(", ")}>
      <table>
        <thead><tr>{block.table.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>
          {block.table.rows.map((row, r) => (
            <tr key={r}>{row.map((cell, c) => (c === 0 ? <th key={c} scope="row"><Inline text={cell} lang={lang} /></th> : <td key={c} data-label={block.table.head[c]}><Inline text={cell} lang={lang} /></td>))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Documento legal (política de privacidad, seguridad…): cabecera de color, tabla de contenido y secciones con ancla. */
export function LegalDocument({ doc, lang }: { doc: LegalDoc; lang: Locale }) {
  const date = new Intl.DateTimeFormat(lang, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${LEGAL.updated}T00:00:00Z`));
  return (
    <>
      <section className="pagehead">
        <div className="wrap">
          <h1>{doc.title}</h1>
          <p>{doc.description}</p>
        </div>
      </section>
      <div className="wrap legal">
        <aside className="legal__side">
          <nav aria-label={doc.tocLabel}>
            <p className="legal__toc-title">{doc.tocLabel}</p>
            <ol>{doc.sections.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.title.replace(/^\d+\.\s*/, "")}</a></li>)}</ol>
          </nav>
        </aside>
        <article className="legal__body">
          <p className="legal__meta">{doc.updatedLabel}: <time dateTime={LEGAL.updated}>{date}</time> · {doc.versionLabel} {LEGAL.version}</p>
          {doc.notice && <p className="legal__note">{doc.notice}</p>}
          <p className="legal__intro">{doc.intro}</p>
          {doc.sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
              <h2 id={`${s.id}-h`}>{s.title}</h2>
              {s.body.map((b, i) => <BlockView key={i} block={b} lang={lang} />)}
            </section>
          ))}
        </article>
      </div>
    </>
  );
}

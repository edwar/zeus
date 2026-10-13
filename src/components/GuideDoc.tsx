import Link from "next/link";
import Markdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { INDEX_SLUG, classifyGuideLink, type GuideEntry } from "@/lib/guide";
import { GuideVideo } from "@/components/GuideVideo";

/** Los encabezados del Markdown bajan un nivel: el título de la página ya es el h1. */
const heading = (Tag: "h2" | "h3" | "h4") => function Heading({ children }: { children?: React.ReactNode }) { return <Tag>{children}</Tag>; };

/** Guía del equipo dentro de la plataforma: el Markdown de `docs/guia-equipo/` con la identidad de Zeus Ops. */
export function GuideDoc({ t, lang, doc, list }: { t: Dict; lang: Locale; doc: { slug: string; body: string }; list: GuideEntry[] }) {
  const g = t.app.guide;
  const base = `/${lang}/app/guide`;
  const href = (slug: string) => (slug === INDEX_SLUG ? base : `${base}/${slug}`);
  const idx = list.findIndex((e) => e.slug === doc.slug);
  // Anterior / siguiente: el índice solo tiene «siguiente»; la primera sección vuelve al índice.
  const prev = doc.slug === INDEX_SLUG ? null : idx > 0 ? { href: href(list[idx - 1].slug), label: `${g.prev}: ${list[idx - 1].title}` } : { href: base, label: g.home };
  const nextEntry = doc.slug === INDEX_SLUG ? list[0] : list[idx + 1];

  const components: Components = {
    h1: heading("h2"),
    h2: heading("h3"),
    h3: heading("h4"),
    // Enlaces entre secciones → rutas de la plataforma; sitios externos → pestaña nueva; archivos del repositorio → solo el texto.
    a({ href: h, children }) {
      const l = classifyGuideLink(h);
      if (l.kind === "section") return <Link href={`${l.slug ? href(l.slug) : ""}${l.hash}`}>{children}</Link>;
      if (l.kind === "external") return <a href={l.href} target="_blank" rel="noopener noreferrer">{children}</a>;
      return <>{children}</>;
    },
    // Video de apoyo: `![Video: título](video:nombre)`. Un párrafo que solo trae el video no lleva <p> (no se puede meter una figura en uno).
    img({ src, alt }) {
      const m = typeof src === "string" ? /^video:([a-z0-9-]+)$/.exec(src) : null;
      return m ? <GuideVideo base={`/api/guide/video/${m[1]}`} title={alt ?? ""} portrait={m[1].endsWith("-movil")} /> : null;
    },
    p({ node, children }) {
      const only = node?.children.length === 1 ? node.children[0] : null;
      const isVideo = only?.type === "element" && only.tagName === "img" && String(only.properties?.src ?? "").startsWith("video:");
      return isVideo ? <>{children}</> : <p>{children}</p>;
    },
    table: ({ children }) => <div className="guidedoc__scroll"><table>{children}</table></div>,
  };

  return (
    <div className="pb guidedoc">
      <header className="ph">
        <div>
          <h1 className="ph__title">{g.title}</h1>
          <p className="ph__sub">{g.sub}</p>
        </div>
      </header>
      <div className="guidedoc__grid">
        <nav aria-label={g.sections} className="guidedoc__toc">
          <ul>
            <li><Link href={base} aria-current={doc.slug === INDEX_SLUG ? "page" : undefined}>{g.home}</Link></li>
            {list.map((e) => (
              <li key={e.slug}><Link href={href(e.slug)} aria-current={e.slug === doc.slug ? "page" : undefined}>{e.title}</Link></li>
            ))}
          </ul>
        </nav>
        <article className="panel guidedoc__body">
          <Markdown remarkPlugins={[remarkGfm]} components={components} urlTransform={(u) => (u.startsWith("video:") ? u : defaultUrlTransform(u))}>{doc.body}</Markdown>
          <nav className="guidedoc__pager" aria-label={g.pager}>
            {prev ? <Link href={prev.href}>← {prev.label}</Link> : <span />}
            {nextEntry && <Link href={href(nextEntry.slug)}>{g.next}: {nextEntry.title} →</Link>}
          </nav>
        </article>
      </div>
    </div>
  );
}

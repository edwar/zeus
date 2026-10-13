import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Guía del equipo: los archivos Markdown de `docs/guia-equipo/`, que se muestran dentro de la plataforma.
 * Solo se sirven los que cumplen el patrón `NN-nombre.md` (más el índice, `README.md`): la plantilla de redacción y
 * cualquier otro archivo no se exponen, y el nombre nunca se arma con lo que escribe el usuario.
 */
const DIR = path.join(process.cwd(), "docs", "guia-equipo");
const SECTION_FILE = /^(\d{2}-[a-z0-9-]+)\.md$/;
export const INDEX_SLUG = "inicio";

export type GuideEntry = { slug: string; title: string };

const titleOf = (md: string, fallback: string) => md.match(/^#\s+(.+)$/m)?.[1].trim() ?? fallback;

/** Secciones en orden (01, 02…), con el título de su primer encabezado. */
export async function listGuide(): Promise<GuideEntry[]> {
  const files = (await readdir(DIR)).filter((f) => SECTION_FILE.test(f)).sort();
  return Promise.all(files.map(async (f) => ({ slug: f.replace(/\.md$/, ""), title: titleOf(await readFile(path.join(DIR, f), "utf8"), f) })));
}

/** Contenido de una sección (o del índice). null si no existe: nunca lee fuera de la lista permitida. */
export async function readGuide(slug: string): Promise<{ slug: string; title: string; body: string } | null> {
  const file = slug === INDEX_SLUG ? "README.md" : (await listGuide()).some((e) => e.slug === slug) ? `${slug}.md` : null;
  if (!file) return null;
  const body = await readFile(path.join(DIR, file), "utf8");
  return { slug, title: titleOf(body, slug), body };
}

export type GuideLink = { kind: "section"; slug: string; hash: string } | { kind: "external"; href: string } | { kind: "none" };

/** Qué hacer con un enlace del Markdown: ir a otra sección de la guía, abrir un sitio externo o quitar el enlace (archivos del repositorio). */
export function classifyGuideLink(href: string | undefined): GuideLink {
  if (!href) return { kind: "none" };
  if (/^https?:\/\//i.test(href)) return { kind: "external", href };
  const m = href.match(/^(?:\.\/)?(README|\d{2}-[a-z0-9-]+)\.md(#[\w-]*)?$/);
  if (m) return { kind: "section", slug: m[1] === "README" ? INDEX_SLUG : m[1], hash: m[2] ?? "" };
  if (/^#[\w-]+$/.test(href)) return { kind: "section", slug: "", hash: href };
  return { kind: "none" };
}

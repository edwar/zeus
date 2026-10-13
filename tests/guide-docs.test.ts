import test from "node:test";
import assert from "node:assert/strict";
import { INDEX_SLUG, classifyGuideLink, listGuide, readGuide } from "../src/lib/guide";

test("guía interna: lista las secciones numeradas en orden y deja fuera la plantilla", async () => {
  const list = await listGuide();
  assert.ok(list.length >= 8);
  assert.deepEqual(list.map((e) => e.slug), [...list.map((e) => e.slug)].sort());
  assert.ok(list.every((e) => /^\d{2}-[a-z0-9-]+$/.test(e.slug) && e.title.trim()));
  assert.ok(!list.some((e) => /plantilla|readme/i.test(e.slug)));
  assert.match(list[0].title, /Acceso y roles/);
});

test("guía interna: cada sección existe, tiene contenido y sus enlaces internos apuntan a secciones reales", async () => {
  const list = await listGuide();
  const slugs = new Set([INDEX_SLUG, ...list.map((e) => e.slug)]);
  for (const slug of slugs) {
    const doc = await readGuide(slug);
    assert.ok(doc && doc.body.length > 200, slug);
    for (const [, href] of doc.body.matchAll(/\]\(([^)]+)\)/g)) {
      const link = classifyGuideLink(href);
      if (link.kind === "section" && link.slug) assert.ok(slugs.has(link.slug), `${slug} enlaza a una sección que no existe: ${href}`);
    }
  }
});

test("guía interna: solo se leen archivos de la lista; nada de rutas inventadas", async () => {
  for (const bad of ["../../.env", "..%2f..%2f.env", "PLANTILLA", "README", "99-no-existe", "01-acceso-y-roles.md", "", "01-acceso-y-roles/../../x"]) {
    assert.equal(await readGuide(bad), null, bad);
  }
  assert.ok(await readGuide(INDEX_SLUG));
});

test("enlaces del Markdown: secciones, externos y archivos del repositorio (se quitan)", () => {
  assert.deepEqual(classifyGuideLink("02-solicitudes-y-cotizacion.md"), { kind: "section", slug: "02-solicitudes-y-cotizacion", hash: "" });
  assert.deepEqual(classifyGuideLink("README.md"), { kind: "section", slug: INDEX_SLUG, hash: "" });
  assert.deepEqual(classifyGuideLink("04-proyectos.md#etapas"), { kind: "section", slug: "04-proyectos", hash: "#etapas" });
  assert.deepEqual(classifyGuideLink("https://zeus.cognilab.dev"), { kind: "external", href: "https://zeus.cognilab.dev" });
  for (const none of ["../../PRODUCT.md", "PLANTILLA.md", "javascript:alert(1)", "/etc/passwd", undefined, ""]) assert.equal(classifyGuideLink(none as string).kind, "none", String(none));
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { LEGAL, PENDING, legalVars, pendingFields } from "../src/lib/legal/config";
import { privacy } from "../src/lib/legal/privacy";
import { security } from "../src/lib/legal/security";
import { securityTxt } from "../src/app/.well-known/security.txt/route";
import type { Block } from "../src/lib/legal/types";

const docs = { privacidad: privacy, seguridad: security };
const textOf = (b: Block): string[] => (typeof b === "string" ? [b] : "list" in b ? b.list : "note" in b ? [b.note] : [...b.table.head, ...b.table.rows.flat()]);

for (const [name, d] of Object.entries(docs)) {
  test(`${name}: español e inglés tienen las mismas secciones, en el mismo orden`, () => {
    assert.deepEqual(d.en.sections.map((s) => s.id), d.es.sections.map((s) => s.id));
  });

  test(`${name}: cada sección tiene id único, título y contenido`, () => {
    for (const doc of [d.es, d.en]) {
      const ids = doc.sections.map((s) => s.id);
      assert.equal(new Set(ids).size, ids.length, "ids repetidos");
      for (const s of doc.sections) {
        assert.ok(/^[a-z-]+$/.test(s.id), `id inválido: ${s.id}`);
        assert.ok(s.title.trim() && s.body.length > 0, `sección vacía: ${s.id}`);
      }
    }
  });

  test(`${name}: toda {variable} de los textos existe en los datos del responsable`, () => {
    const vars = legalVars();
    for (const doc of [d.es, d.en]) {
      for (const s of doc.sections) for (const text of s.body.flatMap(textOf)) {
        for (const [, key] of text.matchAll(/\{(\w+)\}/g)) assert.ok(key in vars, `{${key}} no existe (sección ${s.id})`);
      }
    }
  });

  test(`${name}: los enlaces internos apuntan a páginas que existen`, () => {
    const known = new Set(["/privacy", "/security", "/privacy#terceros", "/.well-known/security.txt"]);
    for (const doc of [d.es, d.en]) {
      for (const s of doc.sections) for (const text of s.body.flatMap(textOf)) {
        for (const [, href] of text.matchAll(/\]\(([^)]+)\)/g)) assert.ok(known.has(href), `enlace desconocido: ${href}`);
      }
    }
  });
}

test("la política de privacidad cubre lo que exige la Ley 1581: responsable, finalidades, derechos, plazos y autorización", () => {
  const all = privacy.es.sections.map((s) => s.id);
  for (const id of ["responsable", "datos", "finalidades", "autorizacion", "terceros", "derechos", "ejercer", "conservacion"]) assert.ok(all.includes(id), `falta la sección ${id}`);
  const text = JSON.stringify(privacy.es);
  for (const must of ["Ley 1581", "Superintendencia de Industria y Comercio", "10 días hábiles", "15 días hábiles", "transferencia internacional"]) {
    assert.ok(text.toLowerCase().includes(must.toLowerCase()), `no menciona: ${must}`);
  }
});

test("la política nombra a los proveedores que realmente intervienen en el código", () => {
  const text = JSON.stringify(privacy.es);
  for (const provider of ["Vercel", "Neon", "OpenStreetMap", "NASA POWER", "Anthropic", "datos.gov.co"]) assert.ok(text.includes(provider), `falta ${provider}`);
});

test("pendingFields detecta los datos sin completar y solo esos", () => {
  const pending = pendingFields();
  assert.ok(pending.every((p) => /^(controller|security|retention)\./.test(p)));
  assert.deepEqual(pendingFields({ a: "ok", b: { c: `${PENDING}: x]`, d: "ok" } }), ["b.c"]);
  assert.deepEqual(pendingFields({ a: "ok" }), []);
  assert.ok(!pending.includes("version") && !pending.includes("site"));
});

test("security.txt cumple RFC 9116: Contact, Expires futuro (≤ 1 año) y Canonical", () => {
  const now = new Date("2026-10-12T00:00:00Z");
  const txt = securityTxt(now, "seguridad@example.com", LEGAL.site);
  assert.match(txt, /^Contact: mailto:seguridad@example\.com$/m);
  assert.match(txt, new RegExp(`^Canonical: ${LEGAL.site}/\\.well-known/security\\.txt$`, "m"));
  const expires = new Date(txt.match(/^Expires: (.+)$/m)![1]);
  const days = (expires.getTime() - now.getTime()) / 86_400_000;
  assert.ok(days > 0 && days <= 365, `Expires a ${days} días`);
});

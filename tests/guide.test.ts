import test from "node:test";
import assert from "node:assert/strict";
import { es } from "../src/i18n/es";
import { en } from "../src/i18n/en";

// La guía del comprador se escribe a la par de las funciones: estas pruebas evitan que un idioma quede a medias o con huecos.
for (const [name, d] of [["es", es], ["en", en]] as const) {
  test(`guía del comprador (${name}): cada paso dice qué haces tú, qué hacemos nosotros y qué recibes`, () => {
    assert.ok(d.guide.steps.length >= 6);
    for (const s of d.guide.steps) {
      assert.ok(s.name.trim() && s.get.trim(), s.name);
      assert.ok(s.you.length > 0 && s.we.length > 0, s.name);
      for (const line of [...s.you, ...s.we]) assert.ok(line.trim().length > 10, `${s.name}: línea vacía o muy corta`);
    }
  });

  test(`guía del comprador (${name}): preguntas con respuesta y sin texto repetido`, () => {
    assert.ok(d.guide.faq.length >= 5);
    const qs = d.guide.faq.map((f) => f.q);
    assert.equal(new Set(qs).size, qs.length);
    for (const f of d.guide.faq) {
      assert.ok(f.q.trim().endsWith("?") || f.q.trim().endsWith("."), f.q);
      assert.ok(f.a.trim().length > 20, f.q);
    }
  });
}

test("guía del comprador: español e inglés tienen los mismos pasos y las mismas preguntas", () => {
  assert.equal(en.guide.steps.length, es.guide.steps.length);
  assert.equal(en.guide.faq.length, es.guide.faq.length);
  es.guide.steps.forEach((s, i) => {
    assert.equal(en.guide.steps[i].you.length, s.you.length, `paso ${i + 1}: «Tú haces»`);
    assert.equal(en.guide.steps[i].we.length, s.we.length, `paso ${i + 1}: «Nosotros hacemos»`);
  });
});

test("guía del comprador: no promete lo que la plataforma aún no hace", () => {
  const all = JSON.stringify([es.guide, es.process, en.guide, en.process]).toLowerCase();
  // Monitoreo hoy es el enlace a la app del inversor; no hay una vista propia de consumo ni de alertas para el cliente.
  assert.doesNotMatch(all, /generación, consumo y alertas|generation, consumption and alerts/);
  assert.doesNotMatch(all, /whatsapp automático|automatic whatsapp/);
});

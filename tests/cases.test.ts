import test from "node:test";
import assert from "node:assert/strict";
import { caseBody, consentBody, missingForPublish, pick, savingsOf, sniffImage, uniqueSlug, type PublishCheck } from "../src/lib/cases";

const today = "2026-10-12";
const ready: PublishCheck = {
  titleEs: "Una panadería que bajó su factura", summaryEs: "Instalaron un sistema de 4 kWp y cambió la factura del mes.", displayName: "Panadería La Esperanza", town: "Girardot",
  kwp: 4, installedOn: "2026-03-01", billBefore: 1_200_000, billAfter: 380_000, evidence: "Facturas de ESSA de febrero y de junio de 2026, comparadas.",
  verifiedOn: "2026-07-10", consentAt: new Date(), consentNote: "Autorización escrita por WhatsApp el 5 de julio de 2026.",
};

test("un caso completo y autorizado se puede publicar", () => {
  assert.deepEqual(missingForPublish(ready, today), []);
});

test("sin la autorización del cliente NUNCA se publica, aunque todo lo demás esté", () => {
  assert.deepEqual(missingForPublish({ ...ready, consentAt: null }, today), ["consent"]);
  assert.deepEqual(missingForPublish({ ...ready, consentNote: null }, today), ["consent"]);
  assert.deepEqual(missingForPublish({ ...ready, consentNote: "ok" }, today), ["consent"], "una nota de dos letras no es constancia");
});

test("sin cómo se verificó el ahorro no se publica", () => {
  assert.deepEqual(missingForPublish({ ...ready, evidence: "" }, today), ["evidence"]);
  assert.deepEqual(missingForPublish({ ...ready, evidence: "se ve que ahorra" }, today), ["evidence"]);
  assert.deepEqual(missingForPublish({ ...ready, verifiedOn: null }, today), ["verifiedOn"]);
});

test("las cifras tienen que ser coherentes: ahorra, no verifica antes de instalar, no hay fechas futuras", () => {
  assert.deepEqual(missingForPublish({ ...ready, billAfter: 1_200_000 }, today), ["savings"]);
  assert.deepEqual(missingForPublish({ ...ready, billAfter: 1_500_000 }, today), ["savings"]);
  assert.deepEqual(missingForPublish({ ...ready, billBefore: 0, billAfter: 0 }, today), ["bills"]);
  assert.deepEqual(missingForPublish({ ...ready, verifiedOn: "2026-02-01" }, today), ["verifiedBeforeInstall"]);
  assert.ok(missingForPublish({ ...ready, installedOn: "2026-12-01" }, today).includes("installedOn"), "no se puede haber instalado en el futuro");
  assert.deepEqual(missingForPublish({ ...ready, verifiedOn: "2026-12-01" }, today), ["verifiedOn"]);
  assert.deepEqual(missingForPublish({ ...ready, kwp: 0 }, today), ["kwp"]);
});

test("un borrador vacío lista todo lo que falta", () => {
  const empty: PublishCheck = { titleEs: "Caso", summaryEs: "", displayName: "", town: "", kwp: 0, installedOn: null, billBefore: 0, billAfter: 0, evidence: "", verifiedOn: null, consentAt: null, consentNote: null };
  assert.deepEqual(missingForPublish(empty, today), ["summary", "displayName", "town", "kwp", "installedOn", "bills", "evidence", "verifiedOn", "consent"]);
});

test("ahorro: monto y porcentaje desde las dos facturas", () => {
  assert.deepEqual(savingsOf(1_200_000, 380_000), { amount: 820_000, pct: 68 });
  assert.deepEqual(savingsOf(100, 100), { amount: 0, pct: 0 });
  assert.deepEqual(savingsOf(100, 150), { amount: 0, pct: 0 });
  assert.deepEqual(savingsOf(0, 0), { amount: 0, pct: 0 });
});

test("formulario: solo el título es obligatorio para guardar un borrador; lo demás se limpia", () => {
  const b = caseBody.parse({ titleEs: "  Mi caso  " });
  assert.equal(b.titleEs, "Mi caso");
  assert.equal(b.quoteEs, null);
  assert.equal(b.kwp, 0);
  assert.equal(b.installedOn, null);
  assert.ok(!caseBody.safeParse({ titleEs: "ab" }).success);
  assert.ok(!caseBody.safeParse({ titleEs: "Mi caso", audience: "gobierno" }).success);
  assert.ok(!caseBody.safeParse({ titleEs: "Mi caso", installedOn: "ayer" }).success);
  assert.ok(!caseBody.safeParse({ titleEs: "Mi caso", billBefore: -1 }).success);
  assert.ok(!caseBody.safeParse({ titleEs: "Mi caso", billBefore: 1.5 }).success);
  assert.equal(caseBody.parse({ titleEs: "Mi caso", quoteEs: "" }).quoteEs, null);
});

test("autorización: dar exige la constancia de cómo se dio; retirarla no", () => {
  assert.ok(consentBody.safeParse({ given: true, note: "Por escrito en WhatsApp, 5 jul." }).success);
  assert.ok(!consentBody.safeParse({ given: true, note: "sí" }).success);
  assert.ok(!consentBody.safeParse({ given: true }).success);
  assert.ok(consentBody.safeParse({ given: false }).success);
});

test("slug: sin tildes, en minúsculas, único con sufijo", () => {
  assert.equal(uniqueSlug("Panadería «La Esperanza»: ¡−68 %!", new Set()), "panaderia-la-esperanza-68");
  assert.equal(uniqueSlug("Caso", new Set(["caso"])), "caso-2");
  assert.equal(uniqueSlug("Caso", new Set(["caso", "caso-2", "caso-3"])), "caso-4");
  assert.equal(uniqueSlug("¡¡¡", new Set()), "caso");
});

test("fotos: el tipo se decide por los bytes, no por lo que dice el navegador", () => {
  assert.deepEqual(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])), { ext: "jpg", type: "image/jpeg" });
  assert.deepEqual(sniffImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])), { ext: "png", type: "image/png" });
  const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
  assert.deepEqual(sniffImage(webp), { ext: "webp", type: "image/webp" });
  assert.equal(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>")), null, "un SVG con scripts no pasa");
  assert.equal(sniffImage(new TextEncoder().encode("%PDF-1.7 ......")), null);
  assert.equal(sniffImage(new Uint8Array()), null);
});

test("idioma: el inglés cuando existe; si falta, el español", () => {
  assert.equal(pick("en", "Hola", "Hello"), "Hello");
  assert.equal(pick("en", "Hola", ""), "Hola");
  assert.equal(pick("en", "Hola", null), "Hola");
  assert.equal(pick("es", "Hola", "Hello"), "Hola");
});

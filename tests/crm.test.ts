import test from "node:test";
import assert from "node:assert/strict";
import { MANUAL_SOURCES, PUBLIC_SOURCES, SOURCES, bucketOf, followUpBody, isPublicSource, leadBody, leadPatch, normEmail, summarizeBySource, todayBogota } from "../src/lib/crm";

test("orígenes: los públicos y los manuales son subconjuntos de los conocidos", () => {
  for (const s of [...PUBLIC_SOURCES, ...MANUAL_SOURCES]) assert.ok((SOURCES as readonly string[]).includes(s), s);
  assert.ok(isPublicSource("catalog") && isPublicSource("simulator"));
  assert.ok(!isPublicSource("event") && !isPublicSource("phone") && !isPublicSource("<script>") && !isPublicSource(undefined));
});

test("hoy se mide en hora de Colombia, no en la del servidor", () => {
  // 03:00 UTC del 13 de octubre sigue siendo la noche del 12 en Colombia (UTC-5).
  assert.equal(todayBogota(new Date("2026-10-13T03:00:00Z")), "2026-10-12");
  assert.equal(todayBogota(new Date("2026-10-13T05:00:00Z")), "2026-10-13");
});

test("recordatorios: vencido, de hoy o próximo", () => {
  assert.equal(bucketOf("2026-10-11", "2026-10-12"), "overdue");
  assert.equal(bucketOf("2026-10-12", "2026-10-12"), "today");
  assert.equal(bucketOf("2026-10-13", "2026-10-12"), "upcoming");
  assert.equal(bucketOf("2025-12-31", "2026-01-01"), "overdue");
});

test("contacto manual: exige teléfono E.164, origen válido y la autorización de la persona", () => {
  const ok = { name: "Ana Pérez", phone: "+573001112233", source: "referral", consent: true };
  const p = leadBody.parse(ok);
  assert.equal(p.email, null);
  assert.equal(p.city, null);
  assert.ok(!leadBody.safeParse({ ...ok, consent: false }).success, "sin autorización no se guarda");
  assert.ok(!leadBody.safeParse({ ...ok, consent: undefined }).success);
  assert.ok(!leadBody.safeParse({ ...ok, phone: "3001112233" }).success);
  assert.ok(!leadBody.safeParse({ ...ok, source: "simulator" }).success, "el simulador no se elige a mano");
  assert.ok(!leadBody.safeParse({ ...ok, source: "hacker" }).success);
  assert.ok(!leadBody.safeParse({ ...ok, name: "A" }).success);
  assert.equal(leadBody.parse({ ...ok, email: "" }).email, null);
  assert.ok(!leadBody.safeParse({ ...ok, email: "no-es-correo" }).success);
  assert.ok(!leadBody.safeParse({ ...ok, followUpOn: "mañana" }).success);
});

test("edición de contacto: solo lo que llega; correo y ciudad vacíos se borran", () => {
  assert.deepEqual(leadPatch.parse({}), {});
  assert.equal(leadPatch.parse({ email: "" }).email, null);
  assert.equal(leadPatch.parse({ city: "" }).city, null);
  assert.ok(!leadPatch.safeParse({ status: "converted" }).success, "pasar a cotización es automático, no manual");
});

test("recordatorio: fecha ISO y descripción", () => {
  assert.ok(followUpBody.safeParse({ dueOn: "2026-10-20", note: "Llamar" }).success);
  assert.ok(!followUpBody.safeParse({ dueOn: "20/10/2026", note: "Llamar" }).success);
  assert.ok(!followUpBody.safeParse({ dueOn: "2026-10-20", note: "x" }).success);
});

test("correo: se compara sin mayúsculas ni espacios", () => {
  assert.equal(normEmail("  Ana@Ejemplo.CO "), "ana@ejemplo.co");
  assert.equal(normEmail(""), null);
  assert.equal(normEmail(null), null);
});

test("resumen por origen: conteos del embudo, tasa y orígenes en cero", () => {
  const rows = summarizeBySource(
    [
      { source: "simulator", status: "new", n: 5 },
      { source: "simulator", status: "contacted", n: 3 },
      { source: "simulator", status: "confirmed", n: 2 },
      { source: "simulator", status: "approved", n: 4 },
      { source: "simulator", status: "discarded", n: 6 },
      { source: "referral", status: "approved", n: 1 },
      { source: "referral", status: "new", n: 1 },
    ],
    [{ source: "referral", n: 3 }, { source: "event", n: 2 }],
  );
  const by = (s: string) => rows.find((r) => r.source === s)!;
  assert.deepEqual(by("simulator"), { source: "simulator", requests: 20, attended: 9, confirmed: 6, approved: 4, discarded: 6, openLeads: 0, rate: 0.2 });
  assert.equal(by("referral").rate, 0.5);
  assert.equal(by("referral").openLeads, 3);
  assert.equal(by("event").requests, 0);
  assert.equal(by("event").rate, null, "sin solicitudes no hay tasa (no es 0 %)");
  assert.equal(by("event").openLeads, 2);
  assert.equal(rows.length, SOURCES.length);
});

test("resumen por origen: un origen desconocido (dato viejo) no se pierde", () => {
  const rows = summarizeBySource([{ source: "otro-viejo", status: "approved", n: 2 }], []);
  assert.equal(rows.find((r) => r.source === "otro-viejo")?.approved, 2);
});

import { createQuoteSchema } from "../src/lib/quotes";

const validQuote = {
  contact: { name: "Ana Pérez", email: "ana@ejemplo.co", phone: "+573001112233" },
  consent: true,
  systemType: "ongrid",
  bill: { monthlyKwh: 300, tariff: 900, currency: "COP", operator: null, municipality: null, department: null, estrato: null, connection: null, coveragePct: 80, peakSunHours: 4.5 },
  sizing: { kwp: 2.9, monthlySolarKwh: 300, monthlySavings: 270000, batteryNominalKwh: 0 },
  items: [{ productId: "abc", qty: 1 }],
};

test("solicitud pública: el origen sale de una lista fija y por defecto es el simulador", () => {
  assert.equal(createQuoteSchema.parse(validQuote).source, "simulator");
  assert.equal(createQuoteSchema.parse({ ...validQuote, source: "catalog" }).source, "catalog");
  for (const bad of ["event", "phone", "other", "<script>", "", 1]) assert.ok(!createQuoteSchema.safeParse({ ...validQuote, source: bad }).success, String(bad));
});

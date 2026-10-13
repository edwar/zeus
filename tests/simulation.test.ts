import test from "node:test";
import assert from "node:assert/strict";
import { SIMULATION_TTL_DAYS, createSimulationBody, leadNote, simulationExpiry, simulationState, summaryOf } from "../src/lib/simulation";

const values = {
  operator: "ESSA", department: "Santander", municipality: "Bucaramanga", lat: "7.1254321", lon: "-73.1198765", sunAnnual: "4.6", sunMin: "4.1", estrato: "3", connection: "single_phase",
  monthlyKwh: "300", tariff: "900", coveragePct: "100", peakSunHours: "4.5", systemType: "ongrid", backupKw: "", autonomyHours: "",
};
const state = { values, kit: { tier: "balanced", custom: {}, qtyEdits: {}, skipped: {} }, fin: { on: false, downPct: 20, termMonths: 36, rate: null, entity: null } };
const body = { lang: "es", state, total: 14_592_200, paybackYears: 6.2 };

test("cálculo guardado: acepta un estado válido y redondea la ubicación a ~1 km", () => {
  const p = simulationState.parse(state);
  assert.equal(p.values.lat, "7.13");
  assert.equal(p.values.lon, "-73.12");
  assert.equal(p.kit.tier, "balanced");
});

test("cálculo guardado: rechaza cifras absurdas, campos de más y listas cerradas inventadas", () => {
  const bad = (patch: object) => simulationState.safeParse({ ...state, ...patch }).success;
  assert.ok(!bad({ values: { ...values, monthlyKwh: "abc" } }));
  assert.ok(!bad({ values: { ...values, monthlyKwh: "9999999" } }));
  assert.ok(!bad({ values: { ...values, systemType: "nuclear" } }));
  assert.ok(!bad({ values: { ...values, estrato: "9" } }));
  assert.ok(!bad({ values: { ...values, extra: "x" } }), "no se aceptan campos desconocidos");
  assert.ok(!bad({ values: { ...values, operator: "x".repeat(81) } }));
  assert.ok(!bad({ kit: { ...state.kit, tier: "gratis" } }));
  assert.ok(!bad({ kit: { ...state.kit, qtyEdits: { a: 0 } } }));
  assert.ok(!bad({ kit: { ...state.kit, qtyEdits: Object.fromEntries(Array.from({ length: 41 }, (_, i) => [`k${i}`, 1])) } }));
  assert.ok(!bad({ fin: { ...state.fin, downPct: 95 } }));
  assert.ok(!bad({ fin: { ...state.fin, termMonths: 1 } }));
  assert.ok(!bad({ extra: true }));
});

test("cálculo guardado: un híbrido exige los datos de respaldo como en el simulador", () => {
  assert.ok(!simulationState.safeParse({ ...state, values: { ...values, systemType: "hybrid" } }).success);
  assert.ok(simulationState.safeParse({ ...state, values: { ...values, systemType: "hybrid", backupKw: "2", autonomyHours: "4" } }).success);
});

test("petición: el origen sale de una lista fija, el idioma por defecto es español y el correo exige la autorización", () => {
  const p = createSimulationBody.parse(body);
  assert.equal(p.source, "simulator");
  assert.equal(createSimulationBody.parse({ ...body, source: "catalog" }).source, "catalog");
  assert.ok(!createSimulationBody.safeParse({ ...body, source: "event" }).success);
  assert.ok(createSimulationBody.safeParse({ ...body, contact: { email: "ana@ejemplo.co", consent: true } }).success);
  assert.ok(!createSimulationBody.safeParse({ ...body, contact: { email: "ana@ejemplo.co", consent: false } }).success, "sin autorización no se guarda el correo");
  assert.ok(!createSimulationBody.safeParse({ ...body, contact: { email: "ana@ejemplo.co" } }).success);
  assert.ok(!createSimulationBody.safeParse({ ...body, contact: { email: "no-es-correo", consent: true } }).success);
  assert.ok(!createSimulationBody.safeParse({ ...body, total: -1 }).success);
});

test("resumen: la potencia y el ahorro se recalculan en el servidor, no se confían al cliente", () => {
  const sum = summaryOf(simulationState.parse(state), 14_592_200, 6.2)!;
  assert.ok(sum.kwp > 0 && sum.monthlyKwh > 0);
  assert.equal(sum.total, 14_592_200);
  assert.ok(sum.monthlySavings != null && sum.monthlySavings > 0);
  assert.match(leadNote(sum), /Guardó su cálculo: sistema de [\d.]+ kWp/);
  assert.match(leadNote({ ...sum, monthlySavings: null, paybackYears: null }), /kit por \$ /);
});

test("vigencia: 60 días", () => {
  const now = new Date("2026-10-12T12:00:00Z");
  assert.equal(simulationExpiry(now).getTime() - now.getTime(), SIMULATION_TTL_DAYS * 86_400_000);
  assert.equal(SIMULATION_TTL_DAYS, 60);
});

import { simulationEmail } from "../src/lib/mail";

test("correo del cálculo: resumen, enlace, vigencia y aviso de por qué lo recibe; en los dos idiomas", () => {
  const url = "https://zeus.cognilab.dev/es/simulator?s=abc&x=1";
  const base = { url, validUntil: new Date("2026-12-11T12:00:00Z"), kwp: 2.9, monthlySavings: 270_000, total: 14_592_200 };
  const es = simulationEmail({ ...base, lang: "es" });
  assert.match(es.subject, /Tu cálculo solar de Zeus/);
  assert.ok(es.text.includes(url) && es.text.includes("2.9 kWp") && es.text.includes("11 de diciembre de 2026"));
  assert.ok(es.text.includes("autorizaste") && es.text.includes("Un asesor podría escribirte"));
  assert.ok(es.html.includes("s=abc&amp;x=1"), "el enlace se escapa en el HTML");
  const en = simulationEmail({ ...base, lang: "en", monthlySavings: null });
  assert.match(en.subject, /Your Zeus solar calculation/);
  assert.ok(en.text.includes("December 11, 2026") && !en.text.includes("Estimated monthly savings"));
});

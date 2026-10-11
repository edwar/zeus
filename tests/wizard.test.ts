import test from "node:test";
import assert from "node:assert/strict";
import { emptyValues, phasesOf, sizingOf, valuesFromBill, validate } from "../src/lib/wizard";
import type { BillData } from "../src/lib/ai/bill";

const bill = (o: Partial<BillData> = {}): BillData => ({
  isEnergyBill: true, operator: "Enel", municipality: "Bogotá", department: "Cundinamarca", estrato: 4, tariffClass: "residential",
  connection: "two_phase", periodFrom: null, periodTo: null, consumptionKwh: 412, history: [], totalAmount: 437510,
  energyChargeAmount: null, unitPrice: 987.28, currency: "COP",
  confidence: { consumption: "high", unitPrice: "high", total: "high", connection: "medium", location: "high" }, warnings: [], ...o,
});

test("lectura completa: marca la conexión con confianza media para revisar", () => {
  const { values, sources } = valuesFromBill(bill());
  assert.equal(values.monthlyKwh, "412");
  assert.equal(values.tariff, "987.28");
  assert.deepEqual([sources.monthlyKwh, sources.tariff, sources.connection, sources.location], ["bill", "bill", "check", "bill"]);
  assert.equal(phasesOf(values.connection), 2);
});

test("consumo: promedia el historial cuando hay 3+ meses", () => {
  const { values } = valuesFromBill(bill({ history: [{ month: "2026-07", kwh: 300 }, { month: "2026-08", kwh: 400 }, { month: "2026-09", kwh: 500 }] }));
  assert.equal(values.monthlyKwh, "400");
});

test("sin costo unitario: se deriva del valor de la energía y se marca como derivada", () => {
  const { values, sources } = valuesFromBill(bill({ unitPrice: null, energyChargeAmount: 406760 }));
  assert.equal(values.tariff, "987.28");
  assert.equal(sources.tariff, "derived");
});

test("datos que faltan quedan vacíos y marcados como faltantes", () => {
  const { values, sources } = valuesFromBill(bill({ unitPrice: null, connection: null, consumptionKwh: null }));
  assert.deepEqual([values.tariff, values.connection, values.monthlyKwh], ["", "", ""]);
  assert.deepEqual([sources.tariff, sources.connection, sources.monthlyKwh], ["missing", "missing", "missing"]);
});

test("validación: híbrido exige carga y horas de autonomía; la tarifa es opcional", () => {
  const v = { ...emptyValues(), monthlyKwh: "400" };
  assert.deepEqual(validate(v), {});
  assert.deepEqual(Object.keys(validate({ ...v, systemType: "hybrid" })).sort(), ["autonomyHours", "backupKw"]);
  assert.deepEqual(Object.keys(validate({ ...v, tariff: "-5", coveragePct: "150" })).sort(), ["coveragePct", "tariff"]);
});

test("dimensionamiento solo si el formulario es válido; acepta coma decimal", () => {
  assert.equal(sizingOf(emptyValues()), null);
  const s = sizingOf({ ...emptyValues(), monthlyKwh: "400", coveragePct: "85", peakSunHours: "5", tariff: "900" })!;
  assert.equal(s.kwp, 2.83);
  const c = sizingOf({ ...emptyValues(), monthlyKwh: "400", peakSunHours: "4,5" })!;
  assert.ok(c.kwp > 0);
});

test("horas sol pico: el aislado usa el mes más bajo; sin dato de lugar no hay valor", async () => {
  const { sunFor } = await import("../src/lib/wizard");
  assert.equal(sunFor("ongrid", "4.9", "4.4"), "4.9");
  assert.equal(sunFor("offgrid", "4.9", "4.4"), "4.4");
  assert.equal(sunFor("hybrid", "", ""), null);
});

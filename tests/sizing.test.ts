import test from "node:test";
import assert from "node:assert/strict";
import { baseMonthlyKwh, paybackYears, size } from "../src/lib/sizing";

test("kWp: 400 kWh/mes, 85 % y 5 h sol → 340/(30×5×0,8) = 2,83 kWp", () => {
  const r = size({ monthlyKwh: 400, coveragePct: 85, peakSunHours: 5, systemType: "ongrid", tariff: 900 });
  assert.equal(r.monthlySolarKwh, 340);
  assert.equal(r.kwp, 2.83);
  assert.equal(r.monthlySavings, 306000);
  assert.equal(r.batteryKwh, 0);
});

test("rango de inversor: DC/AC entre 1,0 y 1,4 (objetivo 1,2)", () => {
  const r = size({ monthlyKwh: 1200, coveragePct: 100, peakSunHours: 5, systemType: "ongrid", tariff: null });
  assert.equal(r.kwp, 10);
  assert.deepEqual(r.inverterKw, { min: 7.14, target: 8.33, max: 10 });
  assert.equal(r.monthlySavings, null);
});

test("híbrido: 2 kW durante 4 h = 8 kWh útiles → 10 kWh nominales con 80 % de descarga", () => {
  const r = size({ monthlyKwh: 300, coveragePct: 100, peakSunHours: 4.5, systemType: "hybrid", tariff: 800, backupLoadKw: 2, autonomyHours: 4 });
  assert.equal(r.batteryKwh, 8);
  assert.equal(r.batteryNominalKwh, 10);
});

test("consumo base: promedio con 3+ meses; si no, el del periodo", () => {
  assert.equal(baseMonthlyKwh(412, [{ kwh: 300 }, { kwh: 400 }, { kwh: 500 }]), 400);
  assert.equal(baseMonthlyKwh(412, [{ kwh: 300 }]), 412);
  assert.equal(baseMonthlyKwh(null, [{ kwh: 300 }]), 300);
  assert.equal(baseMonthlyKwh(null, []), null);
});

test("retorno simple", () => {
  assert.equal(paybackYears(12_000_000, 100_000), 10);
  assert.equal(paybackYears(1, null), null);
});

test("aislado: la batería cubre el consumo diario durante las horas de autonomía", () => {
  // 300 kWh/mes al 100 % → 10 kWh/día; 12 h de autonomía → 5 kWh útiles; /0,8 → 6,25 nominales.
  const r = size({ monthlyKwh: 300, coveragePct: 100, peakSunHours: 5, systemType: "offgrid", tariff: null, backupLoadKw: 2, autonomyHours: 12 });
  assert.equal(r.batteryKwh, 5);
  assert.equal(r.batteryNominalKwh, 6.25);
});

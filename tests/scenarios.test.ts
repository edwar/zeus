import test from "node:test";
import assert from "node:assert/strict";
import { DEGRADATION, YEARS, coverageSteps, cumulativeSavings, evaluate, highlights } from "../src/lib/scenarios";
import { simulateLoan } from "../src/lib/finance/loan";

const fin = { downPct: 20, termMonths: 36, rateEA: 24 };
const s100 = { coveragePct: 100, kwp: 2.9, total: 14_592_200, monthlySavings: 270_000 };
const s50 = { coveragePct: 50, kwp: 1.45, total: 8_000_000, monthlySavings: 135_000 };

test("ahorro acumulado: lineal con una pequeña pérdida de rendimiento, igual que la gráfica", () => {
  assert.equal(cumulativeSavings(1_000_000, 0), 0);
  assert.equal(Math.round(cumulativeSavings(1_000_000, 10)), Math.round(10 * 1_000_000 * Math.pow(DEGRADATION, 5)));
  assert.ok(cumulativeSavings(1_000_000, 15) < 15 * 1_000_000);
  assert.ok(cumulativeSavings(1_000_000, 15) > 14_000_000, "la pérdida es pequeña");
  assert.equal(YEARS, 15);
});

test("al contado: recuperación, ganancia neta y retorno a 15 años", () => {
  const s = evaluate(s100, fin);
  const yearly = 270_000 * 12;
  assert.equal(s.cash!.paybackYears, Math.round((14_592_200 / yearly) * 10) / 10); // 4.5
  assert.equal(s.cash!.netGain, Math.round(cumulativeSavings(yearly, 15) - 14_592_200));
  assert.equal(s.cash!.roiPct, Math.round((s.cash!.netGain / 14_592_200) * 100));
  assert.ok(s.cash!.netGain > 0);
});

test("financiado: la cuota sale del mismo cálculo que el panel de financiación y el flujo es ahorro − cuota", () => {
  const s = evaluate(s100, fin);
  const loan = simulateLoan({ price: 14_592_200, downPct: 20, termMonths: 36, rateEA: 24 });
  assert.deepEqual(s.financed.loan, loan);
  assert.equal(s.financed.monthlyFlow, 270_000 - loan.monthly);
  assert.equal(s.financed.netGain, Math.round(cumulativeSavings(270_000 * 12, 15) - loan.totalPaid));
  assert.ok(s.financed.netGain! < s.cash!.netGain, "financiar cuesta intereses: ganas menos que al contado");
  assert.ok(s.financed.paybackMonths != null && s.financed.paybackMonths > 0);
  assert.equal(s.financed.roiPct, Math.round((s.financed.netGain! / loan.totalPaid) * 100));
});

test("tasa 0 y sin cuota inicial: la cuota es el precio entre los meses y no hay intereses", () => {
  const s = evaluate(s100, { downPct: 0, termMonths: 36, rateEA: 0 });
  assert.equal(s.financed.loan.monthly, Math.round(14_592_200 / 36));
  assert.equal(s.financed.loan.interest, Math.max(0, s.financed.loan.monthly * 36 - 14_592_200));
});

test("sin tarifa no hay ahorro: no se inventan recuperación ni ganancias, pero sí la cuota", () => {
  const s = evaluate({ ...s100, monthlySavings: null }, fin);
  assert.equal(s.cash, null);
  assert.equal(s.financed.monthlyFlow, null);
  assert.equal(s.financed.paybackMonths, null);
  assert.equal(s.financed.netGain, null);
  assert.ok(s.financed.loan.monthly > 0);
  assert.equal(evaluate({ ...s100, monthlySavings: 0 }, fin).cash, null);
});

test("coberturas a comparar: 50, 75 y 100, más la elegida si es otra", () => {
  assert.deepEqual(coverageSteps(100), [50, 75, 100]);
  assert.deepEqual(coverageSteps(75), [50, 75, 100]);
  assert.deepEqual(coverageSteps(80), [50, 75, 80, 100]);
  assert.deepEqual(coverageSteps(30), [30, 50, 75, 100]);
  assert.deepEqual(coverageSteps(0), [50, 75, 100]);
  assert.deepEqual(coverageSteps(250), [50, 75, 100]);
});

test("destacados: gana el que se recupera antes y el de mayor ganancia; con un solo escenario no se destaca", () => {
  const a = evaluate(s50, fin);
  const b = evaluate(s100, fin);
  const h = highlights([a, b]);
  assert.equal(h.fastestPayback, a.cash!.paybackYears <= b.cash!.paybackYears ? 50 : 100);
  assert.equal(h.bestNetCash, a.cash!.netGain >= b.cash!.netGain ? 50 : 100);
  assert.deepEqual(highlights([a]), { fastestPayback: null, bestNetCash: null, bestNetFinanced: null });
  assert.deepEqual(highlights([evaluate({ ...s50, monthlySavings: null }, fin), evaluate({ ...s100, monthlySavings: null }, fin)]), { fastestPayback: null, bestNetCash: null, bestNetFinanced: null });
});

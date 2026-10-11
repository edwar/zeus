import test from "node:test";
import assert from "node:assert/strict";
import { monthlyRate, payment, paybackMonths, shortestCoveredTerm, simulateLoan } from "../src/lib/finance/loan";

test("tasa mensual equivalente a la efectiva anual", () => {
  assert.ok(Math.abs(monthlyRate(12.682503) - 0.01) < 1e-6); // 1% mensual ≈ 12.68% EA
  assert.equal(monthlyRate(0), 0);
});

test("cuota fija: valores conocidos y tasa cero", () => {
  assert.equal(Math.round(payment(1_000_000, 0.01, 12)), 88_849); // tabla estándar de amortización
  assert.equal(payment(1_200_000, 0, 12), 100_000);
  assert.equal(payment(0, 0.01, 12), 0);
});

test("simulación: cuota inicial, saldo, intereses y total pagado", () => {
  const l = simulateLoan({ price: 10_000_000, downPct: 20, termMonths: 24, rateEA: 24 });
  assert.equal(l.down, 2_000_000);
  assert.equal(l.financed, 8_000_000);
  assert.ok(l.monthly > 8_000_000 / 24 && l.monthly < 8_000_000 / 24 + 200_000);
  assert.ok(Math.abs(l.totalPaid - (l.down + l.monthly * 24)) < 1);
  assert.ok(l.interest > 0);
});

test("la cuota inicial se limita a 0–90 %", () => {
  assert.equal(simulateLoan({ price: 1_000_000, downPct: 150, termMonths: 12, rateEA: 20 }).down, 900_000);
  assert.equal(simulateLoan({ price: 1_000_000, downPct: -5, termMonths: 12, rateEA: 20 }).down, 0);
});

test("retorno: cuándo el ahorro acumulado cubre lo pagado acumulado", () => {
  const l = simulateLoan({ price: 6_000_000, downPct: 20, termMonths: 12, rateEA: 0 }); // inicial 1.2M, cuota 400.000
  assert.equal(l.monthly, 400_000);
  assert.equal(paybackMonths(l, 1_000_000), 2); // 1M·m ≥ 1.2M + 0.4M·m  →  m = 2
  assert.equal(paybackMonths(l, 0), null);
  const slow = simulateLoan({ price: 6_000_000, downPct: 0, termMonths: 12, rateEA: 0 }); // cuota 500.000 > ahorro
  assert.equal(paybackMonths(slow, 400_000), 15); // durante las cuotas va en negativo; pasado el plazo 400k·15 = 6M
});

test("plazo más corto cuya cuota cubre el ahorro", () => {
  const t = shortestCoveredTerm({ price: 12_000_000, downPct: 0, rateEA: 0 }, 400_000, [12, 24, 36, 48]);
  assert.equal(t, 36); // 12M / 36 = 333.333 ≤ 400.000 ; a 24 meses serían 500.000
  assert.equal(shortestCoveredTerm({ price: 12_000_000, downPct: 0, rateEA: 0 }, 100_000, [12, 24, 36]), null);
});

import { paybackMonths, simulateLoan, type Loan } from "@/lib/finance/loan";

/**
 * Comparador de escenarios: el mismo recibo con distintos tamaños de sistema (qué parte del consumo se cubre) y, para
 * cada uno, comprar al contado o financiado. Todo es estimación orientativa con los supuestos de abajo.
 */
export const YEARS = 15;
/** Los paneles pierden un poco de rendimiento cada año: el factor 0,995 se aplica cada dos años (≈ 0,25 % anual). Es el mismo que usa la gráfica de ahorro. */
export const DEGRADATION = 0.995;

/** Ahorro acumulado en `years` años a partir del ahorro anual del primer año (tarifa constante, con la pérdida de rendimiento). */
export const cumulativeSavings = (yearlySavings: number, years: number) => years * yearlySavings * Math.pow(DEGRADATION, years / 2);

export type ScenarioInput = { coveragePct: number; kwp: number; total: number; monthlySavings: number | null };
export type FinanceParams = { downPct: number; termMonths: number; rateEA: number };

export type Scenario = ScenarioInput & {
  /** null si no hay ahorro estimado (sin tarifa): solo se puede hablar de precio y cuota. */
  cash: { paybackYears: number; netGain: number; roiPct: number } | null;
  financed: { loan: Loan; monthlyFlow: number | null; paybackMonths: number | null; netGain: number | null; roiPct: number | null };
};

const r1 = (n: number) => Math.round(n * 10) / 10;

export function evaluate(i: ScenarioInput, fin: FinanceParams): Scenario {
  const savings = i.monthlySavings != null && i.monthlySavings > 0 ? i.monthlySavings : null;
  const gain = savings != null ? cumulativeSavings(savings * 12, YEARS) : null;
  const loan = simulateLoan({ price: i.total, downPct: fin.downPct, termMonths: fin.termMonths, rateEA: fin.rateEA });
  return {
    ...i,
    cash: savings != null && gain != null && i.total > 0 ? { paybackYears: r1(i.total / (savings * 12)), netGain: Math.round(gain - i.total), roiPct: Math.round(((gain - i.total) / i.total) * 100) } : null,
    financed: {
      loan,
      monthlyFlow: savings != null ? Math.round(savings - loan.monthly) : null,
      paybackMonths: savings != null ? paybackMonths(loan, savings) : null,
      netGain: gain != null ? Math.round(gain - loan.totalPaid) : null,
      roiPct: gain != null && loan.totalPaid > 0 ? Math.round(((gain - loan.totalPaid) / loan.totalPaid) * 100) : null,
    },
  };
}

/** Porcentajes de cobertura a comparar: 50, 75 y 100 %, más el que la persona ya eligió si es otro. */
export function coverageSteps(current: number): number[] {
  const base = [50, 75, 100];
  const c = Math.round(current);
  return c >= 1 && c <= 100 && !base.includes(c) ? [...base, c].sort((a, b) => a - b) : base;
}

export type Highlights = { fastestPayback: number | null; bestNetCash: number | null; bestNetFinanced: number | null };

/** Qué escenario (por su cobertura) gana en cada criterio. Solo cuentan los que tienen ahorro estimado; con uno solo no se destaca nada. */
export function highlights(list: Scenario[]): Highlights {
  const withSavings = list.filter((s) => s.cash != null);
  if (withSavings.length < 2) return { fastestPayback: null, bestNetCash: null, bestNetFinanced: null };
  const best = (score: (s: Scenario) => number, dir: 1 | -1) => withSavings.reduce((a, b) => (score(b) * dir > score(a) * dir ? b : a)).coveragePct;
  return {
    fastestPayback: best((s) => s.cash!.paybackYears, -1),
    bestNetCash: best((s) => s.cash!.netGain, 1),
    bestNetFinanced: best((s) => s.financed.netGain ?? -Infinity, 1),
  };
}

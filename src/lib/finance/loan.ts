/** Simulación de un crédito de cuota fija (sistema francés). Las tasas se dan como efectivas anuales, en %. */

/** Tasa efectiva mensual equivalente a una efectiva anual (en %). */
export const monthlyRate = (eaPct: number) => Math.pow(1 + eaPct / 100, 1 / 12) - 1;

/** Cuota fija mensual de un préstamo. Con tasa 0 es simplemente capital / meses. */
export function payment(principal: number, rateMonthly: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (rateMonthly <= 0) return principal / months;
  return (principal * rateMonthly) / (1 - Math.pow(1 + rateMonthly, -months));
}

export type LoanInput = { price: number; downPct: number; termMonths: number; rateEA: number };
export type Loan = { down: number; financed: number; monthly: number; interest: number; totalPaid: number; months: number };

export function simulateLoan({ price, downPct, termMonths, rateEA }: LoanInput): Loan {
  const down = Math.round((price * Math.min(Math.max(downPct, 0), 90)) / 100);
  const financed = Math.max(0, price - down);
  const monthly = Math.round(payment(financed, monthlyRate(rateEA), termMonths));
  const interest = Math.max(0, monthly * termMonths - financed);
  return { down, financed, monthly, interest, totalPaid: down + monthly * termMonths, months: termMonths };
}

/** Meses hasta que lo ahorrado cubre todo lo pagado (cuota inicial + cuotas). null si no lo cubre en `limit` meses. */
export function paybackMonths(loan: Loan, monthlySavings: number, limit = 360): number | null {
  if (monthlySavings <= 0) return null;
  for (let m = 1; m <= limit; m++) {
    if (monthlySavings * m >= loan.down + loan.monthly * Math.min(m, loan.months)) return m;
  }
  return null;
}

/** Plazo más corto (entre los dados) en el que la cuota la cubre el ahorro mensual. null si ninguno. */
export function shortestCoveredTerm(input: Omit<LoanInput, "termMonths">, monthlySavings: number, terms: readonly number[]): number | null {
  for (const t of [...terms].sort((a, b) => a - b)) {
    if (simulateLoan({ ...input, termMonths: t }).monthly <= monthlySavings) return t;
  }
  return null;
}

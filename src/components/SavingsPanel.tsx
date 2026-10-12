import { useId } from "react";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { money } from "@/lib/format";

const YEARS = 15;
const CW = 560;
const CH = 230;
const pad = { l: 12, r: 12, t: 16, b: 30 };

type Props = {
  t: Dict;
  lang: Locale;
  monthlyKwh: number;
  tariff: number | null;
  monthlySavings: number | null;
  kwp: number;
  total: number;
};

/** "Lo que cambia": ahorro, retorno y ahorro acumulado, calculados con los datos de la factura y el kit elegido. */
export function SavingsPanel({ t, lang, monthlyKwh, tariff, monthlySavings, kwp, total }: Props) {
  const s = t.sim;
  const uid = useId().replace(/:/g, "");
  const num = new Intl.NumberFormat(lang, { maximumFractionDigits: 1, useGrouping: "always" });
  const cop = (n: number) => money(lang, n, "COP");

  if (!tariff || !monthlySavings || monthlySavings <= 0) {
    return (
      <section className="sim__panel res" aria-labelledby={`${uid}out`}>
        <h3 id={`${uid}out`}>{s.results}</h3>
        <p className="wiz__hint">{t.wiz.kit.noTariff}</p>
      </section>
    );
  }

  const before = monthlyKwh * tariff;
  const yearly = monthlySavings * 12;
  const payback = total / yearly;
  const paybackText = payback < 1 ? `${Math.max(1, Math.round(payback * 12))} ${s.months}` : `${num.format(payback)} ${s.years}`;
  // Ahorro acumulado menos la inversión, con una pequeña pérdida anual de rendimiento de los paneles.
  const series = Array.from({ length: YEARS + 1 }, (_, y) => y * yearly * Math.pow(0.995, y / 2) - total);

  const min = Math.min(...series, 0);
  const max = Math.max(...series, 1);
  const x = (i: number) => pad.l + (i / YEARS) * (CW - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (CH - pad.t - pad.b);
  const pts = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const be = series.findIndex((v) => v >= 0);
  const beX = be > 0 ? x(be - 1 + (0 - series[be - 1]) / (series[be] - series[be - 1])) : null;

  return (
    <section className="sim__panel res" aria-labelledby={`${uid}out`} aria-live="polite">
      <h3 id={`${uid}out`}>{s.results}</h3>
      <div className="res__big">
        <span className="res__hero">{cop(monthlySavings)}</span>
        <span className="res__herolabel">{s.monthly}</span>
      </div>
      <dl className="res__compare">
        <div><dt>{s.before}</dt><dd>{cop(before)}</dd></div>
        <div className="is-after"><dt>{s.after}</dt><dd>{cop(Math.max(0, before - monthlySavings))}</dd></div>
      </dl>
      <dl className="res__minis">
        <div><dt>{s.yearly}</dt><dd>{cop(yearly)}</dd></div>
        <div><dt>{s.payback}</dt><dd>{paybackText}</dd></div>
        <div><dt>{s.size}</dt><dd>{num.format(kwp)} {s.kwp}</dd></div>
        <div><dt>{s.kwh}</dt><dd>{num.format(monthlyKwh)} {s.kwhUnit}</dd></div>
      </dl>
      <div>
        <h4 style={{ font: "700 1rem var(--font-ui)", marginBottom: "0.5rem" }}>{s.chartTitle}</h4>
        <svg viewBox={`0 0 ${CW} ${CH}`} className="chart" role="img" aria-labelledby={`${uid}c`}>
          <title id={`${uid}c`}>{s.chartSr}</title>
          <rect x={pad.l} y={y(0)} width={CW - pad.l - pad.r} height={Math.max(0, CH - pad.b - y(0))} fill="#dcecf8" opacity="0.5" />
          <line x1={pad.l} x2={CW - pad.r} y1={y(0)} y2={y(0)} stroke="#435850" strokeWidth="1.5" />
          <polyline points={pts} fill="none" stroke="#14805a" strokeWidth="3.5" strokeLinejoin="round" />
          {beX !== null && (
            <g>
              <line x1={beX} x2={beX} y1={pad.t} y2={CH - pad.b} stroke="#7a4f00" strokeWidth="1.5" strokeDasharray="4 4" />
              <circle cx={beX} cy={y(0)} r="6" fill="#f5b82e" stroke="#11201a" strokeWidth="2" />
              <text x={Math.min(beX + 8, CW - 130)} y={pad.t + 12} fontSize="13" fontWeight="700" fill="#7a4f00">{s.breakEven}</text>
            </g>
          )}
          {[0, 5, 10, 15].map((yr) => (
            <text key={yr} x={x(yr)} y={CH - 8} fontSize="12" fill="#435850" textAnchor={yr === 0 ? "start" : yr === 15 ? "end" : "middle"}>{s.year} {yr}</text>
          ))}
        </svg>
      </div>
      <p className="sim__disc">{s.disclaimer}</p>
    </section>
  );
}

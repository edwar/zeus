"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Dict } from "@/i18n";

const SOLAR_PEAK = 4.0;

const gen = (h: number) => (h <= 6 || h >= 18 ? 0 : SOLAR_PEAK * Math.pow(Math.sin(((h - 6) / 12) * Math.PI), 1.6));

const bump = (h: number, c: number, w: number) => Math.exp(-Math.pow((h - c) / w, 2));
// Perfiles de demanda ilustrativos (kW) de un día típico, según el tipo de lugar.
const PROFILES = {
  home: (h: number) => 0.45 + 0.7 * bump(h, 7, 1.2) + 0.5 * bump(h, 13, 2) + 1.9 * bump(h, 19.5, 2.2), // mañana, almuerzo y noche
  office: (h: number) => 0.4 + 2.9 * Math.min(1, bump(h, 12.5, 4.2) * 1.5) - 0.5 * bump(h, 12.5, 0.7), // jornada de oficina
  shop: (h: number) => 0.5 + 2.2 * Math.min(1, bump(h, 15, 5.5) * 1.3) + 0.5 * bump(h, 19, 1.6), // abierto de mañana a noche
  workshop: (h: number) => 0.3 + 3.2 * Math.min(1, bump(h, 12, 4.6) * 1.45) - 0.9 * bump(h, 12.5, 0.6), // maquinaria de día, pausa al almuerzo
} as const;
type Profile = keyof typeof PROFILES;
const PROFILE_KEYS = Object.keys(PROFILES) as Profile[];

// Lienzo: la escena arriba y el gráfico del día debajo.
const W = 560;
const H = 500;
const SCENE = { x: 0, y: 0, w: 560, h: 290 };
const CH = { x: 28, y: 322, w: 504, h: 118 };
const H0 = 6;
const H1 = 22;
const hx = (h: number) => CH.x + ((h - H0) / (H1 - H0)) * CH.w;
const cy = (kw: number) => CH.y + CH.h - (kw / 4.4) * CH.h;

// Color del cielo según la hora: noche → amanecer → día → atardecer → noche.
const SKY: [number, [number, number, number]][] = [
  [0, [20, 32, 92]],
  [5.5, [27, 44, 112]],
  [7, [255, 184, 138]],
  [10, [143, 211, 255]],
  [14, [112, 198, 255]],
  [17, [255, 190, 120]],
  [18.8, [255, 124, 96]],
  [20.2, [27, 44, 112]],
  [24, [20, 32, 92]],
];
function skyAt(h: number) {
  for (let i = 1; i < SKY.length; i++) {
    const [h1, c1] = SKY[i];
    const [h0, c0] = SKY[i - 1];
    if (h <= h1) {
      const t = (h - h0) / (h1 - h0);
      return `rgb(${c0.map((v, k) => Math.round(v + (c1[k] - v) * t)).join(" ")})`;
    }
  }
  return "rgb(20 32 92)";
}

function fmtHour(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm === 60 ? 0 : mm).padStart(2, "0")}`;
}

// Paneles del tejado: 2 filas × 6 columnas, un trapecio en perspectiva ligera.
const PANEL_ROWS = 2;
const PANEL_COLS = 6;

export function SolarDay({ t }: { t: Dict["hero"] }) {
  const uid = useId().replace(/:/g, "");
  const [hour, setHour] = useState(13);
  const [profile, setProfile] = useState<Profile>("home");
  const load = PROFILES[profile];
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    setHour(6.5);
    setPlaying(true);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const start = performance.now();
    const from = hour;
    const span = 17.5 - from;
    const dur = Math.max(1, span) * 650; // ~650 ms por hora
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 2);
      setHour(from + span * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else {
        setPlaying(false);
        setHour(13);
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const g = gen(hour);
  const a = load(hour);
  const share = g / SOLAR_PEAK; // 0..1 de lo que produce el techo ahora
  const covered = a > 0 ? Math.min(100, Math.round((g / a) * 100)) : 0;
  const night = hour < 6 || hour > 18;
  const sky = skyAt(hour);

  // El sol recorre un arco de izquierda a derecha y se oculta tras la colina.
  const st = (hour - 5.5) / (19.5 - 5.5);
  const sunX = 40 + st * (W - 80);
  const sunY = 232 - Math.sin(Math.max(0, Math.min(1, st)) * Math.PI) * 190;

  const genPath = useMemo(() => {
    const pts: string[] = [];
    for (let h = H0; h <= H1; h += 0.25) pts.push(`${hx(h).toFixed(1)},${cy(gen(h)).toFixed(1)}`);
    return pts;
  }, []);
  const acPath = useMemo(() => {
    const pts: string[] = [];
    for (let h = H0; h <= H1; h += 0.25) pts.push(`${hx(h).toFixed(1)},${cy(PROFILES[profile](h)).toFixed(1)}`);
    return pts;
  }, [profile]);

  return (
    <figure className="sd">
      <div className="sd__profiles" role="radiogroup" aria-label={t.profileLabel}>
        {PROFILE_KEYS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={profile === k} onClick={() => setProfile(k)}>{t.profiles[k]}</button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${uid}t`} className="sd__svg">
        <title id={`${uid}t`}>{t.sr}</title>
        <defs>
          <clipPath id={`${uid}scene`}>
            <rect x={SCENE.x} y={SCENE.y} width={SCENE.w} height={SCENE.h} rx="26" />
          </clipPath>
          <linearGradient id={`${uid}area`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ffc21a" stopOpacity="0.7" />
            <stop offset="1" stopColor="#ffc21a" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Escena: cielo, sol, colinas y la casa con paneles */}
        <g clipPath={`url(#${uid}scene)`}>
          <rect x="0" y="0" width={W} height={SCENE.h} fill={sky} />
          {night && (
            <g fill="#fff" opacity="0.85">
              <circle cx="70" cy="48" r="2" /><circle cx="150" cy="86" r="1.6" /><circle cx="236" cy="40" r="2" />
              <circle cx="330" cy="70" r="1.6" /><circle cx="420" cy="44" r="2" /><circle cx="500" cy="92" r="1.6" />
            </g>
          )}
          {/* Halo y disco solar */}
          <g opacity={night ? 0 : 1}>
            <circle cx={sunX} cy={sunY} r={54 + 30 * share} fill="#fff" opacity={0.16 + 0.2 * share} />
            <circle cx={sunX} cy={sunY} r={38} fill="#fff" opacity="0.4" />
            <circle cx={sunX} cy={sunY} r="26" fill="#ffc21a" stroke="#0b1f18" strokeWidth="4" />
          </g>
          {/* Nubes */}
          <g fill="#fff" stroke="#0b1f18" strokeWidth="3" opacity={night ? 0.25 : 1}>
            <path d="M70 118h82a17 17 0 0 0 0-34 24 24 0 0 0-46-6 20 20 0 0 0-36 40z" transform="translate(0 0)" />
            <path d="M388 96h92a15 15 0 0 0 0-30 21 21 0 0 0-40-5 18 18 0 0 0-52 35z" />
          </g>
          {/* Colinas */}
          <path d="M-10 244 Q 120 196 260 232 T 570 214 V 300 H -10 Z" fill="#5fcf8a" stroke="#0b1f18" strokeWidth="4" />
          <path d="M-10 268 Q 160 236 300 262 T 570 256 V 300 H -10 Z" fill="#c8f24b" stroke="#0b1f18" strokeWidth="4" />

          {/* Casa */}
          <g>
            <rect x="188" y="170" width="184" height="94" rx="6" fill="#fff" stroke="#0b1f18" strokeWidth="4" />
            <rect x="262" y="206" width="36" height="58" rx="5" fill="#ff7a2f" stroke="#0b1f18" strokeWidth="4" />
            <rect x="204" y="190" width="40" height="34" rx="5" fill={night && a > 0.8 ? "#ffe27a" : "#bfe3ff"} stroke="#0b1f18" strokeWidth="4" />
            <rect x="318" y="190" width="40" height="34" rx="5" fill={night && a > 0.8 ? "#ffe27a" : "#bfe3ff"} stroke="#0b1f18" strokeWidth="4" />
            {/* Tejado con paneles solares */}
            <path d="M168 176 L 212 112 H 348 L 392 176 Z" fill="#0b1f18" />
            {Array.from({ length: PANEL_ROWS }).map((_, r) =>
              Array.from({ length: PANEL_COLS }).map((__, c) => {
                const y0 = 118 + r * 28;
                const inset = (1 - (y0 - 112) / 64) * 0; // sin perspectiva extra: celdas rectas
                const x0 = 214 + c * 22.2 + inset;
                return (
                  <g key={`${r}-${c}`}>
                    <rect x={x0} y={y0} width="19.6" height="25" rx="3" fill="#2352e6" />
                    <rect x={x0} y={y0} width="19.6" height="25" rx="3" fill="#ffc21a" opacity={night ? 0 : Math.min(1, share * 1.15)} />
                  </g>
                );
              }),
            )}
            <path d="M168 176 L 212 112 H 348 L 392 176 Z" fill="none" stroke="#0b1f18" strokeWidth="4" strokeLinejoin="round" />
          </g>
        </g>
        <rect x="2" y="2" width={W - 4} height={SCENE.h - 4} rx="25" fill="none" stroke="#0b1f18" strokeWidth="4" />

        {/* Gráfico del día */}
        <g aria-hidden="true">
          {[0, 2, 4].map((v) => (
            <g key={v}>
              <line x1={CH.x} x2={CH.x + CH.w} y1={cy(v)} y2={cy(v)} stroke="#d3e0d9" strokeWidth="1.5" />
              <text x={CH.x} y={cy(v) - 5} fill="#3d544b" fontSize="12" fontWeight="600">{v} {v === 4 ? t.kw : ""}</text>
            </g>
          ))}
          {[6, 9, 12, 15, 18, 21].map((h) => (
            <text key={h} x={hx(h)} y={CH.y + CH.h + 20} fill="#3d544b" fontSize="12" fontWeight="600" textAnchor="middle">{h}h</text>
          ))}
          <polygon points={`${hx(H0)},${cy(0)} ${genPath.join(" ")} ${hx(H1)},${cy(0)}`} fill={`url(#${uid}area)`} />
          <polyline points={genPath.join(" ")} fill="none" stroke="#f0a500" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={acPath.join(" ")} fill="none" stroke="#2352e6" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
          <line x1={hx(hour)} x2={hx(hour)} y1={CH.y - 8} y2={CH.y + CH.h} stroke="#0b1f18" strokeWidth="2" strokeDasharray="4 5" />
          <circle cx={hx(hour)} cy={cy(g)} r="8" fill="#ffc21a" stroke="#0b1f18" strokeWidth="3.5" />
          <circle cx={hx(hour)} cy={cy(a)} r="8" fill="#2352e6" stroke="#0b1f18" strokeWidth="3.5" />
        </g>
      </svg>

      <div className="sd__readout">
        <div className="sd__time">
          <span className="sd__timeval" aria-live="off">{fmtHour(hour)}</span>
          <span className="sd__timelabel">{t.dialLabel}</span>
        </div>
        <dl className="sd__stats">
          <div className="sd__chip sd__chip--sun">
            <dt>{t.solar}</dt>
            <dd>{g.toFixed(1)} <small>{t.kw}</small></dd>
          </div>
          <div className="sd__chip sd__chip--sky">
            <dt>{t.demand} · {t.profiles[profile]}</dt>
            <dd>{a.toFixed(1)} <small>{t.kw}</small></dd>
          </div>
          <div className="sd__chip sd__chip--lima">
            <dt>{t.covered}</dt>
            <dd>{covered}<small>%</small></dd>
          </div>
        </dl>
      </div>

      <div className="sd__control">
        <button type="button" className="sd__play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? t.playing : t.paused}>
          {playing ? (
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="4" y="3" width="4" height="14" rx="1" fill="currentColor" /><rect x="12" y="3" width="4" height="14" rx="1" fill="currentColor" /></svg>
          ) : (
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 3l12 7-12 7z" fill="currentColor" /></svg>
          )}
        </button>
        <label className="sr-only" htmlFor={`${uid}r`}>{t.dialLabel}</label>
        <input
          id={`${uid}r`}
          type="range"
          className="range sd__range"
          min={6}
          max={22}
          step={0.25}
          value={hour}
          aria-valuetext={fmtHour(hour)}
          onChange={(e) => {
            setPlaying(false);
            setHour(parseFloat(e.target.value));
          }}
          style={{ ["--track" as string]: "#e4eee8", ["--thumb" as string]: "#ffc21a", ["--thumb-edge" as string]: "#0b1f18" }}
        />
      </div>
      <figcaption className="sd__note">{t.chartNote}</figcaption>
    </figure>
  );
}

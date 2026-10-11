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

const W = 560;
const H = 540;
const WIN = { x: 20, y: 70, w: 520, h: 250 };
const CH = { x: 20, y: 360, w: 520, h: 130 };
const H0 = 6;
const H1 = 22;
const hx = (h: number, box = CH) => box.x + ((h - H0) / (H1 - H0)) * box.w;
const cy = (kw: number) => CH.y + CH.h - (kw / 4.4) * CH.h;

function fmtHour(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm === 60 ? 0 : mm).padStart(2, "0")}`;
}

export function LatticeHero({ t }: { t: Dict["hero"] }) {
  const uid = useId().replace(/:/g, "");
  const [hour, setHour] = useState(14);
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
        setHour(14);
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
  const covered = a > 0 ? Math.min(100, Math.round((g / a) * 100)) : 0;
  const sunX = hx(hour, WIN);
  const sunT = (hour - H0) / (H1 - H0);
  const sunY = WIN.y - 14 - Math.sin(Math.max(0, Math.min(1, sunT)) * Math.PI) * 26;
  const night = hour < 6 || hour > 18;

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

  const slatCount = 13;
  const slatW = 22;
  const gap = (WIN.w - slatCount * slatW) / (slatCount + 1);

  return (
    <figure className="lat">
      <div className="lat__profiles" role="radiogroup" aria-label={t.profileLabel}>
        {PROFILE_KEYS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={profile === k} onClick={() => setProfile(k)}>{t.profiles[k]}</button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${uid}t`} className="lat__svg">
        <title id={`${uid}t`}>{t.sr}</title>
        <defs>
          <clipPath id={`${uid}win`}>
            <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} />
          </clipPath>
          <filter id={`${uid}blur`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <linearGradient id={`${uid}wall`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#bcd3c6" />
            <stop offset="1" stopColor="#9fbdad" />
          </linearGradient>
          <linearGradient id={`${uid}area`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#f5b82e" stopOpacity="0.55" />
            <stop offset="1" stopColor="#f5b82e" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* sun arc + disc */}
        <path
          d={`M ${WIN.x} ${WIN.y - 14} Q ${WIN.x + WIN.w / 2} ${WIN.y - 66} ${WIN.x + WIN.w} ${WIN.y - 14}`}
          fill="none"
          stroke="#24493a"
          strokeWidth="1.5"
          strokeDasharray="3 6"
        />
        <circle cx={sunX} cy={sunY} r="12" fill="#f5b82e" opacity={night ? 0.3 : 1} />

        {/* lit wall behind lattice */}
        <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} fill={`url(#${uid}wall)`} />
        <g clipPath={`url(#${uid}win)`}>
          <g filter={`url(#${uid}blur)`} opacity={night ? 0 : 0.35 + 0.65 * (g / SOLAR_PEAK)}>
            <rect x={sunX - 70} y={WIN.y - 20} width="140" height={WIN.h + 40} fill="#f5b82e" />
          </g>
          <g opacity={night ? 0 : 0.5 + 0.5 * (g / SOLAR_PEAK)}>
            <rect x={sunX - 22} y={WIN.y} width="44" height={WIN.h} fill="#fff0c7" />
          </g>
          {/* slats */}
          {Array.from({ length: slatCount }).map((_, i) => {
            const x = WIN.x + gap + i * (slatW + gap);
            return (
              <g key={i}>
                <rect x={x + slatW} y={WIN.y} width="6" height={WIN.h} fill="#082017" opacity="0.28" />
                <rect x={x} y={WIN.y} width={slatW} height={WIN.h} fill="#082017" />
                <rect x={x} y={WIN.y} width="3" height={WIN.h} fill="#24493a" />
              </g>
            );
          })}
        </g>
        <rect x={WIN.x - 4} y={WIN.y - 4} width={WIN.w + 8} height={WIN.h + 8} fill="none" stroke="#24493a" strokeWidth="4" />

        {/* chart */}
        <g aria-hidden="true">
          {[0, 1, 2, 3, 4].map((v) => (
            <g key={v}>
              <line x1={CH.x} x2={CH.x + CH.w} y1={cy(v)} y2={cy(v)} stroke="#24493a" strokeWidth="1" />
              <text x={CH.x} y={cy(v) - 4} fill="#a9c7b8" fontSize="11">
                {v} {v === 4 ? t.kw : ""}
              </text>
            </g>
          ))}
          {[6, 9, 12, 15, 18, 21].map((h) => (
            <text key={h} x={hx(h)} y={CH.y + CH.h + 18} fill="#a9c7b8" fontSize="11" textAnchor="middle">
              {h}h
            </text>
          ))}
          <polygon points={`${hx(H0)},${cy(0)} ${genPath.join(" ")} ${hx(H1)},${cy(0)}`} fill={`url(#${uid}area)`} />
          <polyline points={genPath.join(" ")} fill="none" stroke="#f5b82e" strokeWidth="3" strokeLinejoin="round" />
          <polyline points={acPath.join(" ")} fill="none" stroke="#7cc0f5" strokeWidth="3" strokeDasharray="1 0" strokeLinejoin="round" />
          <line x1={hx(hour)} x2={hx(hour)} y1={CH.y - 6} y2={CH.y + CH.h} stroke="#eaf5ee" strokeWidth="1.5" />
          <circle cx={hx(hour)} cy={cy(g)} r="6" fill="#f5b82e" stroke="#082017" strokeWidth="2" />
          <circle cx={hx(hour)} cy={cy(a)} r="6" fill="#7cc0f5" stroke="#082017" strokeWidth="2" />
        </g>
      </svg>

      <div className="lat__readout">
        <div className="lat__time">
          <span className="lat__timeval" aria-live="off">{fmtHour(hour)}</span>
          <span className="lat__timelabel">{t.dialLabel}</span>
        </div>
        <dl className="lat__stats">
          <div>
            <dt><i className="key key--sun" aria-hidden="true" />{t.solar}</dt>
            <dd>{g.toFixed(1)} <small>{t.kw}</small></dd>
          </div>
          <div>
            <dt><i className="key key--sky" aria-hidden="true" />{t.demand} · {t.profiles[profile]}</dt>
            <dd>{a.toFixed(1)} <small>{t.kw}</small></dd>
          </div>
          <div>
            <dt>{t.covered}</dt>
            <dd>{covered}<small>%</small></dd>
          </div>
        </dl>
      </div>

      <div className="lat__control">
        <button type="button" className="lat__play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? t.playing : t.paused}>
          {playing ? (
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="4" y="3" width="4" height="14" fill="currentColor" /><rect x="12" y="3" width="4" height="14" fill="currentColor" /></svg>
          ) : (
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 3l12 7-12 7z" fill="currentColor" /></svg>
          )}
        </button>
        <label className="sr-only" htmlFor={`${uid}r`}>{t.dialLabel}</label>
        <input
          id={`${uid}r`}
          type="range"
          className="range lat__range"
          min={6}
          max={22}
          step={0.25}
          value={hour}
          aria-valuetext={fmtHour(hour)}
          onChange={(e) => {
            setPlaying(false);
            setHour(parseFloat(e.target.value));
          }}
          style={{ ["--track" as string]: "#24493a", ["--thumb" as string]: "#f5b82e", ["--thumb-edge" as string]: "#082017" }}
        />
      </div>
      <figcaption className="lat__note">{t.chartNote}</figcaption>
    </figure>
  );
}

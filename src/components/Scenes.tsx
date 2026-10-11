/* Ilustraciones decorativas del portal: formas planas, contorno de tinta y colores de fruta. Todas son aria-hidden. */

const INK = "#0b1f18";

/** Disco solar con rayos redondeados. `className` controla tamaño y posición. */
export function SunBurst({ className }: { className?: string }) {
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg className={className} viewBox="-120 -120 240 240" aria-hidden="true" focusable="false">
      {rays.map((a) => (
        <rect key={a} x="-7" y="-112" width="14" height="30" rx="7" fill={INK} transform={`rotate(${a})`} opacity="0.9" />
      ))}
      <circle r="62" fill="#fff1b8" stroke={INK} strokeWidth="6" />
      <circle r="42" fill="#ffc21a" stroke={INK} strokeWidth="6" />
    </svg>
  );
}

export function HouseArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 150" aria-hidden="true" focusable="false">
      <ellipse cx="100" cy="138" rx="86" ry="8" fill={INK} opacity="0.12" />
      <rect x="34" y="62" width="132" height="72" rx="8" fill="#fff" stroke={INK} strokeWidth="5" />
      <path d="M22 66 L 60 22 H 140 L 178 66 Z" fill="#2352e6" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M72 32h14v28H72zM96 32h14v28H96zM120 32h14v28h-14z" fill="#ffc21a" opacity="0.9" />
      <rect x="86" y="92" width="28" height="42" rx="6" fill="#ff7a2f" stroke={INK} strokeWidth="5" />
      <rect x="46" y="82" width="26" height="24" rx="5" fill="#bfe3ff" stroke={INK} strokeWidth="5" />
      <rect x="128" y="82" width="26" height="24" rx="5" fill="#bfe3ff" stroke={INK} strokeWidth="5" />
    </svg>
  );
}

export function ShopArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 150" aria-hidden="true" focusable="false">
      <ellipse cx="100" cy="138" rx="86" ry="8" fill={INK} opacity="0.12" />
      <rect x="28" y="52" width="144" height="82" rx="8" fill="#fff" stroke={INK} strokeWidth="5" />
      <path d="M22 54 L 34 20 H 166 L 178 54 Z" fill="#ff7a2f" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M22 54h156v14a26 26 0 0 1-52 0 26 26 0 0 1-52 0 26 26 0 0 1-52 0z" fill="#ffc21a" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <rect x="46" y="86" width="52" height="48" rx="6" fill="#bfe3ff" stroke={INK} strokeWidth="5" />
      <rect x="116" y="86" width="38" height="48" rx="6" fill="#c8f24b" stroke={INK} strokeWidth="5" />
    </svg>
  );
}

export function VillageArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 150" aria-hidden="true" focusable="false">
      <ellipse cx="160" cy="138" rx="150" ry="8" fill="#fff" opacity="0.18" />
      <g stroke={INK} strokeWidth="5" strokeLinejoin="round">
        <rect x="14" y="78" width="70" height="56" rx="6" fill="#fff" />
        <path d="M8 82 L 49 44 L 90 82 Z" fill="#ffc21a" />
        <rect x="118" y="56" width="84" height="78" rx="6" fill="#fff" />
        <path d="M110 60 L 160 14 L 210 60 Z" fill="#c8f24b" />
        <rect x="240" y="82" width="64" height="52" rx="6" fill="#fff" />
        <path d="M234 86 L 272 50 L 310 86 Z" fill="#ff7a2f" />
        <rect x="142" y="92" width="36" height="42" rx="6" fill="#2352e6" />
        <rect x="34" y="98" width="30" height="36" rx="6" fill="#2352e6" />
        <rect x="258" y="102" width="28" height="32" rx="6" fill="#2352e6" />
      </g>
    </svg>
  );
}

/** Iconos de domótica, uno por cada ítem de la lista (en el mismo orden que el diccionario). */
export function DomIcon({ index, className }: { index: number; className?: string }) {
  const common = { fill: "none", stroke: INK, strokeWidth: 4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {index === 0 && (
        <g {...common}>
          <circle cx="24" cy="24" r="9" fill="#ffc21a" />
          <path d="M24 5v6M24 37v6M5 24h6M37 24h6M10.6 10.6l4.2 4.2M33.2 33.2l4.2 4.2M10.6 37.4l4.2-4.2M33.2 14.8l4.2-4.2" />
        </g>
      )}
      {index === 1 && (
        <g {...common}>
          <rect x="6" y="6" width="16" height="16" rx="4" fill="#c8f24b" />
          <rect x="26" y="6" width="16" height="16" rx="4" fill="#fff" />
          <rect x="6" y="26" width="16" height="16" rx="4" fill="#fff" />
          <rect x="26" y="26" width="16" height="16" rx="4" fill="#ffc21a" />
        </g>
      )}
      {index === 2 && (
        <g {...common}>
          <path d="M12 34V22a12 12 0 0 1 24 0v12l3 4H9z" fill="#ff7a2f" />
          <path d="M20 42a4 4 0 0 0 8 0" />
        </g>
      )}
      {index === 3 && (
        <g {...common}>
          <rect x="6" y="14" width="32" height="22" rx="5" fill="#c8f24b" />
          <path d="M38 22h4v6h-4M22 18l-5 8h7l-3 7" />
        </g>
      )}
    </svg>
  );
}

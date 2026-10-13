/** Iconos de las acciones de cuenta (guía, cambiar contraseña, cerrar sesión): se comparten entre la barra lateral y el menú del móvil. */
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinejoin: "round", strokeLinecap: "round", "aria-hidden": true } as const;

export const GuideIcon = ({ size = 20 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><path d="M3 5a2 2 0 012-2h5a2 2 0 012 2v16a2 2 0 00-2-2H3zM21 5a2 2 0 00-2-2h-5a2 2 0 00-2 2v16a2 2 0 012-2h7z" /></svg>
);
export const KeyIcon = ({ size = 20 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3M14 9l2 2" /></svg>
);
export const ExitIcon = ({ size = 20 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><path d="M10 4H5v16h5M16 8l4 4-4 4M20 12H9" /></svg>
);

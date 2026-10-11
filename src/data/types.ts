export type Stage = "lead" | "visit" | "design" | "install" | "monitor";
// "lead" existe en la base por compatibilidad, pero los proyectos nacen al aprobar una solicitud: empiezan en visita técnica.
export const stages: Stage[] = ["visit", "design", "install", "monitor"];

export type Project = {
  id: string;
  name: string;
  client: string;
  town: string;
  kwp: number;
  stage: Stage;
  owner: string;
  openAlerts?: number; // alertas de monitoreo sin atender
  team?: string | null; // nombre del equipo operativo asignado
  due: string; // ISO date
  blocked?: boolean;
  progress: number; // 0-100 within the stage
};

export const PSH_FOR_KIT = 5.2; // horas de sol pleno de referencia
export const kitMonthlyKwh = (kwp: number) => Math.round(kwp * PSH_FOR_KIT * 30 * 0.8);

// Curva horaria ilustrativa (kW) para el panel técnico
export const genCurve = (h: number, peak: number) => {
  if (h <= 6 || h >= 18) return 0;
  return peak * Math.pow(Math.sin(((h - 6) / 12) * Math.PI), 1.6);
};
export const loadCurve = (h: number, peak: number) => {
  const base = 0.28;
  const a = Math.exp(-Math.pow((h - 15.2) / 3.4, 2));
  const b = 0.45 * Math.exp(-Math.pow((h - 21) / 2.2, 2));
  return peak * Math.min(1, base + 0.8 * a + b);
};

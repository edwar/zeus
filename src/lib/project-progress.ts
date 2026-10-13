/** Cálculo del avance de un proyecto a partir de su cronograma. Lo comparten el expediente interno y el portal del cliente. */
export type MsInput = { startDate: string; len: number; done: number }; // startDate: YYYY-MM-DD
export type MsState = "done" | "doing" | "late" | "todo";

const DAY = 86_400_000;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/** Hoy como YYYY-MM-DD. En el servidor se fija la zona (Colombia); en el navegador, la del usuario. */
export const todayIso = (timeZone?: string) => new Date().toLocaleDateString("sv-SE", timeZone ? { timeZone } : undefined);

/** Último día del hito (inclusive). */
export const milestoneEnd = (m: MsInput) => new Date(utc(m.startDate) + (m.len - 1) * DAY).toISOString().slice(0, 10);

export const milestoneState = (m: MsInput, today: string): MsState =>
  m.done >= 100 ? "done" : milestoneEnd(m) < today ? "late" : m.startDate <= today || m.done > 0 ? "doing" : "todo";

/** Avance general 0-100, ponderado por la duración de cada hito. */
export function overallProgress(ms: MsInput[]): number {
  const days = ms.reduce((n, m) => n + m.len, 0);
  return days ? Math.round(ms.reduce((n, m) => n + m.done * m.len, 0) / days) : 0;
}

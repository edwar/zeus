import { z } from "zod";

/**
 * Modo campo: el equipo trabaja sin conexión y todo lo que hace se guarda como operaciones («marqué este paso», «subí este avance»)
 * que se envían cuando vuelve la señal. Aquí están las reglas puras: qué es una operación, cómo se aplica en el teléfono
 * (para que la pantalla responda al instante) y cómo se resuelven los choques (gana la última escritura).
 */
const id = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/); // generado en el teléfono: hace idempotente el envío
const at = z.iso.datetime({ offset: true }); // la hora del teléfono cuando se hizo (no la del envío)
const key = z.string().regex(/^[a-z][a-z0-9_]{1,30}$/);
const ref = z.string().min(1).max(60);

export const opSchema = z.discriminatedUnion("type", [
  z.object({ id, type: z.literal("check"), projectId: ref, key, done: z.boolean(), note: z.string().trim().max(300).nullable().optional(), at }),
  z.object({ id, type: z.literal("material"), projectId: ref, mid: ref, ready: z.boolean(), at }),
  z.object({ id, type: z.literal("progress"), projectId: ref, mid: ref, done: z.number().int().min(0).max(100), at }),
  z.object({
    id, type: z.literal("handover"), projectId: ref, at,
    signerName: z.string().trim().min(2).max(120),
    // PNG pequeño dibujado en el teléfono: se valida el formato y el tamaño, no se confía en lo que diga el cliente.
    signature: z.string().max(150_000).regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/),
    notes: z.string().trim().max(500).nullable().optional(),
  }),
]);
export type Op = z.infer<typeof opSchema>;
export const syncBody = z.object({ ops: z.array(opSchema).min(1).max(200) });

export type FieldCheck = { key: string; labelEs: string; labelEn: string; order: number; done: boolean; doneAt: string | null; doneBy: string | null; note: string | null };
export type FieldMaterial = { id: string; name: string; qty: number; ready: boolean };
export type FieldMilestone = { id: string; label: string; startDate: string; len: number; done: number };
export type FieldPhoto = { id: string; checkKey: string | null; takenAt: string; by: string | null };
export type FieldProject = {
  id: string; name: string; client: string; town: string; kwp: number; stage: string;
  checks: FieldCheck[]; materials: FieldMaterial[]; milestones: FieldMilestone[]; photos: FieldPhoto[];
  handover: { signedAt: string; signerName: string } | null;
};

/** Sobre qué cosa actúa una operación: dos operaciones del mismo objetivo se reemplazan (solo importa la última). */
export const opTarget = (o: Op) =>
  o.type === "check" ? `check:${o.projectId}:${o.key}` : o.type === "material" ? `material:${o.projectId}:${o.mid}` : o.type === "progress" ? `progress:${o.projectId}:${o.mid}` : `handover:${o.projectId}`;

/** Agrega una operación a la cola; si ya había una pendiente sobre lo mismo, queda solo la nueva (marcar y desmarcar no se envía dos veces). */
export function enqueue(queue: Op[], op: Op): Op[] {
  return [...queue.filter((q) => opTarget(q) !== opTarget(op)), op];
}

/** Aplica una operación a un proyecto en el teléfono (respuesta inmediata); no toca nada del servidor. */
export function applyOp(p: FieldProject, op: Op, by: string): FieldProject {
  if (op.projectId !== p.id) return p;
  switch (op.type) {
    case "check":
      return { ...p, checks: p.checks.map((c) => (c.key === op.key ? { ...c, done: op.done, doneAt: op.done ? op.at : null, doneBy: op.done ? by : null, note: op.note === undefined ? c.note : op.note } : c)) };
    case "material":
      return { ...p, materials: p.materials.map((m) => (m.id === op.mid ? { ...m, ready: op.ready } : m)) };
    case "progress":
      return { ...p, milestones: p.milestones.map((m) => (m.id === op.mid ? { ...m, done: op.done } : m)) };
    case "handover":
      return { ...p, handover: { signedAt: op.at, signerName: op.signerName } };
  }
}

/** Vuelve a aplicar lo pendiente sobre lo que acaba de bajar del servidor, para que lo no enviado siga viéndose. */
export const applyAll = (projects: FieldProject[], queue: Op[], by: string) => projects.map((p) => queue.reduce((acc, op) => applyOp(acc, op, by), p));

/** Gana la última escritura: se aplica si es igual o más reciente que lo que ya hay. */
export const shouldApply = (existing: Date | null | undefined, incoming: Date) => !existing || incoming.getTime() >= existing.getTime();

/** La hora del teléfono puede estar mal: nunca en el futuro y no más de 30 días atrás (si no, se usa la del servidor). */
export function clampAt(at: Date, now: Date): Date {
  const t = at.getTime();
  return t > now.getTime() + 5 * 60_000 || t < now.getTime() - 30 * 86_400_000 ? now : at;
}

/** Pasos hechos / total, para la barra de avance del checklist. */
export const checklistProgress = (checks: { done: boolean }[]) => ({ done: checks.filter((c) => c.done).length, total: checks.length });

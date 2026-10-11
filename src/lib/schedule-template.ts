export type SystemType = "ongrid" | "hybrid" | "offgrid";
export type Crew = "A" | "B" | "E";
export type TemplateMilestone = { label: string; startDate: string; len: number; crew: Crew };

type Step = { key: string; label: string; len: number; crew: Crew; after: string[] };

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

const EN: Record<string, string> = {
  "Visita técnica": "Site visit",
  "Diseño y planos": "Design and drawings",
  "Compra y entrega de materiales": "Purchase and delivery of materials",
  "Trámite con el operador de red": "Grid operator paperwork",
  "Montaje de estructura": "Mounting structure",
  "Paneles y cableado DC": "Panels and DC wiring",
  "Inversor y protecciones": "Inverter and protections",
  "Inversor, protecciones y baterías": "Inverter, protections and batteries",
  "Pruebas y puesta en marcha": "Testing and commissioning",
  "Entrega y capacitación al cliente": "Handover and customer training",
};

/**
 * Plantilla de instalación. Los días son de referencia y se ajustan al tamaño; el asesor puede editarlos.
 * - Con baterías (híbrido/aislado) el montaje del inversor lleva más tiempo.
 * - Sin conexión a la red (aislado) no hay trámite con el operador.
 * - El trámite corre en paralelo con la compra de materiales, y las pruebas esperan a que termine todo.
 */
export function buildSchedule({ systemType, kwp, start, lang = "es" }: { systemType: SystemType; kwp: number; start: string; lang?: "es" | "en" }): TemplateMilestone[] {
  const big = kwp > 5;
  const hasBattery = systemType !== "ongrid";
  const grid = systemType !== "offgrid";
  const steps: Step[] = [
    { key: "visit", label: "Visita técnica", len: 1, crew: "E", after: [] },
    { key: "design", label: "Diseño y planos", len: 2, crew: "E", after: ["visit"] },
    { key: "materials", label: "Compra y entrega de materiales", len: 5, crew: "E", after: ["design"] },
    ...(grid ? [{ key: "grid", label: "Trámite con el operador de red", len: 10, crew: "E" as Crew, after: ["design"] }] : []),
    { key: "structure", label: "Montaje de estructura", len: big ? 2 : 1, crew: "A", after: ["materials"] },
    { key: "panels", label: "Paneles y cableado DC", len: big ? 2 : 1, crew: "A", after: ["structure"] },
    { key: "inverter", label: hasBattery ? "Inversor, protecciones y baterías" : "Inversor y protecciones", len: hasBattery || big ? 2 : 1, crew: "B", after: ["panels"] },
    { key: "commissioning", label: "Pruebas y puesta en marcha", len: 1, crew: "B", after: ["inverter", ...(grid ? ["grid"] : [])] },
    { key: "handover", label: "Entrega y capacitación al cliente", len: 1, crew: "E", after: ["commissioning"] },
  ];

  const end = new Map<string, number>(); // día (desde `start`) en que termina cada paso
  return steps.map((s) => {
    const from = Math.max(0, ...s.after.map((k) => end.get(k) ?? 0));
    end.set(s.key, from + s.len);
    return { label: lang === "en" ? (EN[s.label] ?? s.label) : s.label, startDate: addDays(start, from), len: s.len, crew: s.crew };
  });
}

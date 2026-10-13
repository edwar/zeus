/**
 * Checklist de instalación: lo que el equipo verifica en obra antes de entregar. Las claves son estables (se guardan en la base y
 * las usan las fotos); solo cambian los textos. Cambia según el tipo de sistema: con baterías hay un paso más, y sin conexión a la
 * red no hay trámite con el operador.
 */
export type SystemKind = "ongrid" | "hybrid" | "offgrid";
export type CheckTemplate = { key: string; es: string; en: string };

const T = (key: string, es: string, en: string): CheckTemplate => ({ key, es, en });

const SITE = T("site", "Sitio y seguridad verificados (acceso, techo, equipo de protección)", "Site and safety checked (access, roof, protective gear)");
const MATERIALS = T("materials", "Materiales recibidos y revisados contra la lista del proyecto", "Materials received and checked against the project list");
const STRUCTURE = T("structure", "Estructura de soporte instalada y fijada", "Mounting structure installed and fastened");
const PANELS = T("panels", "Paneles montados y cableado DC conectado", "Panels mounted and DC wiring connected");
const GROUND = T("ground", "Puesta a tierra y protecciones instaladas", "Grounding and protections installed");
const INVERTER = T("inverter", "Inversor instalado y conectado", "Inverter installed and connected");
const BATTERIES = T("batteries", "Baterías instaladas, conectadas y protegidas", "Batteries installed, connected and protected");
const GRID = T("grid", "Trámite con el operador de red entregado o iniciado", "Grid operator paperwork submitted or started");
const TEST = T("test", "Pruebas de funcionamiento y puesta en marcha", "Operation tests and commissioning");
const MONITOR = T("monitor", "Monitoreo conectado y enlace verificado", "Monitoring connected and link verified");
const CLEAN = T("clean", "Área limpia y residuos retirados", "Area cleaned and waste removed");
const TRAINING = T("training", "Capacitación al cliente (uso, apagado seguro y app)", "Customer training (use, safe shutdown and app)");

export function checklistFor(system: SystemKind | string | null | undefined): CheckTemplate[] {
  const kind: SystemKind = system === "hybrid" || system === "offgrid" ? system : "ongrid";
  return [
    SITE, MATERIALS, STRUCTURE, PANELS, GROUND, INVERTER,
    ...(kind === "ongrid" ? [] : [BATTERIES]),
    ...(kind === "offgrid" ? [] : [GRID]),
    TEST, MONITOR, CLEAN, TRAINING,
  ];
}

/** Para firmar la conformidad el trabajo tiene que estar completo: todos los pasos hechos. */
export const checklistComplete = (items: { done: boolean }[]) => items.length > 0 && items.every((i) => i.done);

import type { Candidate, KitProduct } from "./kit";
import type { SystemType } from "./sizing";
import { hasBattery } from "./sizing";

/**
 * Complementos de instalación que un kit real lleva además de paneles, inversor, baterías y estructura:
 * cableado, conectores, terminales, gabinete, monitoreo y material eléctrico (protecciones).
 * Las cantidades son de referencia; el técnico las ajusta en la visita.
 */
export const EXTRA_KEYS = ["cableRed", "cableBlack", "mc4", "electricalKit", "monitoring", "batteryCable", "bankNeg", "bankPos", "lugs", "cabinet", "trays"] as const;
export type ExtraKey = (typeof EXTRA_KEYS)[number];

export type ExtraSlot = { key: ExtraKey; unit: "u" | "m"; candidates: Candidate[]; selectedId: string | null };

type Ctx = {
  catalog: KitProduct[];
  systemType: SystemType;
  panelCount: number;
  inverter: Candidate | null;
  battery: Candidate | null;
  chosen?: Partial<Record<ExtraKey, string>>;
};

const METERS_PER_PANEL = 5; // por polaridad (ida y vuelta se cuentan como dos cables)
const PANELS_PER_STRING = 8;
const MAX_ALTERNATIVES = 6;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

const sectionOf = (name: string) => Number(/1\*(\d+)\s*mm2/i.exec(name)?.[1] ?? NaN);
const colorOf = (name: string) => (/negro/i.test(name) ? "black" : /rojo/i.test(name) ? "red" : /verde/i.test(name) ? "green" : "other");
const cabinetHeight = (name: string) => Number(/gabinete\s+(\d+)\s*\*/i.exec(name)?.[1] ?? NaN);
const lugSection = (name: string) => Number(/cable\s+(\d+)\s*mm/i.exec(name)?.[1] ?? NaN);

/** Kits de material eléctrico: se parte del nombre ("On grid", "Híbrido", "Aislado", kW o amperios de CA). */
function kitInfo(name: string) {
  const family = /on.?grid/i.test(name) ? "ongrid" : /h[ií]brid/i.test(name) ? "hybrid" : /aislad|off.?grid/i.test(name) ? "offgrid" : null;
  const kw = /(\d+(?:[.,]\d+)?)\s*kw(?!h)/i.exec(name);
  const w = /(\d{3,6})\s*w\b/i.exec(name);
  const powerW = kw ? Number(kw[1].replace(",", ".")) * 1000 : w ? Number(w[1]) : null;
  const ac = /(\d+)\s*a?\s*ac\b/i.exec(name) ?? /\bac\s*(\d+)\s*a/i.exec(name);
  return { family, powerW, acA: ac ? Number(ac[1]) : null };
}

const asCandidate = (p: KitProduct, qty: number, perUnit = p.price): Candidate => ({ ...p, qty, lineTotal: p.price * qty, perUnit });
const sortedBy = (list: KitProduct[], score: (p: KitProduct) => number) => [...list].sort((a, b) => score(a) - score(b) || a.price - b.price);

function slot(key: ExtraKey, unit: "u" | "m", list: KitProduct[], qty: number, chosen?: string): ExtraSlot | null {
  if (!list.length || qty <= 0) return null;
  const candidates = list.slice(0, MAX_ALTERNATIVES).map((p) => asCandidate(p, qty));
  const sel = candidates.find((c) => c.id === chosen) ?? candidates[0];
  return { key, unit, candidates, selectedId: sel.id };
}

export function buildExtras({ catalog, systemType, panelCount, inverter, battery, chosen }: Ctx): ExtraSlot[] {
  const of = (kind: KitProduct["kind"]) => catalog.filter((p) => p.kind === kind && p.price > 0);
  const out: (ExtraSlot | null)[] = [];

  // Cableado entre paneles e inversor: un cable por polaridad, de 6 mm² por defecto (se pueden elegir otras secciones).
  if (panelCount > 0) {
    const meters = Math.max(10, panelCount * METERS_PER_PANEL);
    const cables = of("cable_dc").filter((p) => sectionOf(p.name) <= 16);
    const bySection = (p: KitProduct) => Math.abs(sectionOf(p.name) - 6);
    out.push(slot("cableRed", "m", sortedBy(cables.filter((p) => colorOf(p.name) === "red"), bySection), meters, chosen?.cableRed));
    out.push(slot("cableBlack", "m", sortedBy(cables.filter((p) => colorOf(p.name) === "black"), bySection), meters, chosen?.cableBlack));
    out.push(slot("mc4", "u", of("connector"), 4 * Math.ceil(panelCount / PANELS_PER_STRING), chosen?.mc4));
  }

  // Material eléctrico (breakers, fusibles, canaleta…): el que mejor encaje con el tipo de sistema y la potencia del inversor.
  if (inverter?.powerW) {
    const invW = inverter.powerW * inverter.packQty;
    const needAC = invW / 120; // corriente AC aproximada a 120 V
    const score = (p: KitProduct) => {
      const k = kitInfo(p.name);
      const famPenalty = (k.family === systemType ? 0 : k.family === null ? 0.5 : 10) + (/trif[aá]sic/i.test(p.name) && inverter.phases !== 3 ? 5 : 0);
      if (k.powerW) return famPenalty + Math.abs(k.powerW - invW) / invW;
      if (k.acA) return famPenalty + Math.abs(k.acA - needAC) / needAC;
      return famPenalty + 3;
    };
    out.push(slot("electricalKit", "u", sortedBy(of("electrical_kit"), score), 1, chosen?.electricalKit));

    // Monitoreo WiFi: solo si hay uno de la marca del inversor (no es intercambiable entre marcas).
    const brand = norm(inverter.manufacturer);
    out.push(slot("monitoring", "u", of("monitoring").filter((p) => brand.length > 2 && norm(p.name).includes(brand)), 1, chosen?.monitoring));
  }

  // Sistemas con baterías: cables batería–inversor, cables de potencia del banco y terminales.
  if (hasBattery(systemType) && inverter && battery) {
    const brand = norm(battery.manufacturer);
    // El cable batería–inversor es propio de cada marca de batería: sin uno compatible se deja para la cotización formal.
    const sameBrand = of("battery_cable").filter((p) => brand.length > 2 && norm(p.name).includes(brand));
    out.push(slot("batteryCable", "u", sameBrand, 2, chosen?.batteryCable));

    const volts = inverter.voltageV ?? battery.voltageV ?? 48;
    const amps = (inverter.powerW! * inverter.packQty) / volts;
    const want = amps > 40 ? 50 : 16;
    const power = of("cable_dc").filter((p) => sectionOf(p.name) >= 16);
    const near = (p: KitProduct) => Math.abs(sectionOf(p.name) - want);
    out.push(slot("bankNeg", "m", sortedBy(power.filter((p) => colorOf(p.name) === "black"), near), 2, chosen?.bankNeg));
    out.push(slot("bankPos", "m", sortedBy(power.filter((p) => colorOf(p.name) !== "black"), near), 2, chosen?.bankPos));
    out.push(slot("lugs", "u", sortedBy(of("terminal").filter((p) => /ojo\s*10\s*mm/i.test(p.name)), (p) => Math.abs(lugSection(p.name) - want)), 4, chosen?.lugs));

    // Baterías de rack (Pylontech y similares): gabinete y una bandeja por batería.
    const units = battery.qty * battery.packQty;
    if (/pylontech|us\d{4}|rack/i.test(battery.name)) {
      const need = 30 * units + 30; // cm de alto aproximados
      const cabs = [...of("cabinet")].sort((a, b) => cabinetHeight(a.name) - cabinetHeight(b.name));
      const fit = cabs.filter((p) => cabinetHeight(p.name) >= need);
      const ordered = fit.length ? [...fit, ...cabs.filter((p) => !fit.includes(p))] : [...cabs].reverse();
      out.push(slot("cabinet", "u", ordered, 1, chosen?.cabinet));
      out.push(slot("trays", "u", of("rack_tray"), units, chosen?.trays));
    }
  }
  return out.filter((x): x is ExtraSlot => x !== null);
}

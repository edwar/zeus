import type { Spec } from "../scraper/autosolar";

export type ProductKind =
  | "panel" | "inverter_ongrid" | "inverter_hybrid" | "battery" | "structure"
  // Complementos de instalación
  | "cable_dc" | "connector" | "terminal" | "battery_cable" | "cabinet" | "rack_tray" | "monitoring" | "electrical_kit"
  | "other";

/** Complementos de instalación: no tienen categoría propia fiable, así que se reconocen por el nombre. */
export function installKindFromName(name: string): ProductKind {
  if (/^cable solar 1\*\d+\s*mm2/i.test(name)) return "cable_dc";
  if (/^conector mc4(?!.*\by\b)(?!-y)/i.test(name)) return "connector";
  if (/^terminal de ojo/i.test(name)) return "terminal";
  if (/^cables?\b.*bater[ií]a.?inversor/i.test(name)) return "battery_cable";
  if (/^gabinete\b.*bater/i.test(name)) return "cabinet";
  if (/^bandeja tipo rack/i.test(name)) return "rack_tray";
  if (/^monitorizaci[oó]n/i.test(name)) return "monitoring";
  if (/^kit material el[eé]ctrico/i.test(name)) return "electrical_kit";
  return "other";
}

export type Classification = {
  kind: ProductKind;
  powerW: number | null; // por unidad (paneles, inversores)
  capacityWh: number | null; // por unidad (baterías)
  voltageV: number | null; // nominal de la batería / bus DC del inversor
  phases: number | null;
  packQty: number; // unidades que trae el producto ("Pack 7 ud")
};

/**
 * El primer segmento de la URL de producto es la categoría de Autosolar (`/baterias-de-litio-48v/...`).
 * Es más fiable que el nombre: "Accesorios de Baterías" contiene gabinetes, cables y monitores que dicen "Batería".
 */
export function categorySlug(sourceUrl: string | null | undefined): string | null {
  if (!sourceUrl) return null;
  try {
    return new URL(sourceUrl).pathname.split("/").filter(Boolean)[0] ?? null;
  } catch {
    return null;
  }
}

export function kindFromSlug(slug: string | null): ProductKind {
  if (!slug) return "other";
  if (/^paneles-solares/.test(slug)) return "panel";
  if (/^inversores-on-grid/.test(slug)) return "inverter_ongrid";
  if (slug === "inversores-solares-hibridos") return "inverter_hybrid";
  if (/^baterias-/.test(slug)) return "battery";
  if (/^estructura-/.test(slug)) return "structure";
  return "other";
}

const num = (s: string) => Number(s.replace(",", "."));

/** Primera potencia del texto, en W: "620W", "10KW", "6000 W", "3000TL-X2" (no confunde kWh con kW). */
function parsePowerW(text: string): number | null {
  const m = /(\d+(?:[.,]\d+)?)\s*(kw(?!h)|wp?(?![a-z]))/i.exec(text);
  if (m) return Math.round(num(m[1]) * (m[2].toLowerCase().startsWith("k") ? 1000 : 1));
  const tl = /(\d{3,5})\s*TL/i.exec(text); // Growatt MIN 3000TL-X2 → 3000 W
  return tl ? Number(tl[1]) : null;
}

/** Tensión nominal: 51,2 V (LiFePO4 16S) se trata como el bus de 48 V; lo demás se redondea. */
function nominalVoltage(v: number): number {
  if (v >= 46 && v <= 52) return 48;
  if (v >= 23 && v <= 26) return 24;
  if (v >= 11.5 && v <= 13.5) return 12;
  return Math.round(v);
}

function parseVoltage(text: string): number | null {
  const m = /(\d{1,3}(?:[.,]\d)?)\s*v(?![a-z])/i.exec(text);
  return m ? nominalVoltage(num(m[1])) : null;
}

function parseCapacityWh(text: string, voltageV: number | null): number | null {
  const kwh = /(\d+(?:[.,]\d+)?)\s*kwh/i.exec(text);
  if (kwh) return Math.round(num(kwh[1]) * 1000);
  const ah = /(\d+(?:[.,]\d+)?)\s*ah\b/i.exec(text); // GEL/AGM: Ah × V
  return ah && voltageV ? Math.round(num(ah[1]) * voltageV) : null;
}

function parsePhases(text: string, slug: string | null): number | null {
  if (/trif[aá]sic/i.test(text) || slug?.endsWith("trifasicos")) return 3;
  if (/bif[aá]sic/i.test(text) || slug?.endsWith("bifasicos")) return 2;
  if (/monof[aá]sic/i.test(text)) return 1;
  return null;
}

/** Estructuras: cuántos paneles soporta ("…1 panel solar", "…para 4 paneles"). */
function parsePanelsCovered(text: string): number {
  const m = /(\d+)\s*paneles?/i.exec(text);
  return m ? Math.max(1, Number(m[1])) : 1;
}

function parsePack(text: string): number {
  const m = /pack\s+(\d+)\s*ud/i.exec(text);
  return m ? Math.max(1, Number(m[1])) : 1;
}

/** Potencia desde la ficha cuando el nombre no la trae ("Potencia nominal de salida AC=10000W"). */
function powerFromSpecs(specs: Spec[]): number | null {
  const s = specs.find((x) => /potencia.*(nominal|m[aá]xima|wp)/i.test(x.label) && !/entrada|fv/i.test(x.label));
  return s ? parsePowerW(s.value) : null;
}

export function classifyProduct(p: { name: string; sourceUrl?: string | null; specs?: Spec[] }): Classification {
  const slug = categorySlug(p.sourceUrl);
  const kind = kindFromSlug(slug);
  const out: Classification = { kind, powerW: null, capacityWh: null, voltageV: null, phases: null, packQty: parsePack(p.name) };
  if (kind === "other") {
    out.kind = installKindFromName(p.name);
    return out;
  }

  if (kind === "panel" || kind === "inverter_ongrid" || kind === "inverter_hybrid") {
    out.powerW = parsePowerW(p.name) ?? powerFromSpecs(p.specs ?? []);
  }
  if (kind === "inverter_ongrid" || kind === "inverter_hybrid") out.phases = parsePhases(p.name, slug);
  if (kind === "inverter_hybrid" || kind === "battery") out.voltageV = parseVoltage(p.name);
  if (kind === "battery") out.capacityWh = parseCapacityWh(p.name, out.voltageV);
  if (kind === "structure") out.packQty = parsePanelsCovered(p.name);
  return out;
}

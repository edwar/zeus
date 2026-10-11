import { BATTERY_DOD, DC_AC, hasBattery, type SystemType } from "./sizing";
import type { ProductKind } from "./catalog/classify";
import { buildExtras, type ExtraKey, type ExtraSlot } from "./install-kit";

export type KitProduct = {
  id: string;
  slug: string;
  name: string;
  manufacturer: string;
  category: string | null;
  kind: ProductKind;
  powerW: number | null;
  capacityWh: number | null;
  voltageV: number | null;
  phases: number | null;
  packQty: number;
  price: number; // precio de venta unitario (con comisión)
  image: string | null;
};

export type Candidate = KitProduct & {
  qty: number; // unidades de este producto sugeridas
  lineTotal: number;
  dcAc?: number; // inversores: relación potencia FV / AC resultante
  perUnit: number; // costo por W / Wh / panel, para ordenar
};

export type WarningKey = "no_panels" | "no_inverter" | "inverter_out_of_range" | "no_battery" | "no_structure" | "multi_inverter";

export type Slot = { candidates: Candidate[]; selectedId: string | null };

export type KitInput = {
  systemType: SystemType;
  phases: 1 | 2 | 3 | null;
  targetKwp: number;
  backupKw?: number;
  backupNominalKwh?: number; // capacidad nominal de batería requerida
  selection?: { panelId?: string; panelQty?: number; inverterId?: string; batteryId?: string; structureId?: string; extras?: Partial<Record<ExtraKey, string>> };
};

export type KitResult = {
  panels: Slot;
  inverter: Slot;
  batteries: Slot | null;
  structure: Slot;
  extras: ExtraSlot[];
  arrayKwp: number;
  panelCount: number;
  warnings: WarningKey[];
};

const MAX_ALTERNATIVES = 8;

const cand = (p: KitProduct, qty: number, perUnit: number, extra: Partial<Candidate> = {}): Candidate => ({
  ...p,
  qty,
  lineTotal: p.price * qty,
  perUnit,
  ...extra,
});

const pick = <T extends { id: string }>(list: T[], id?: string): T | null => list.find((c) => c.id === id) ?? list[0] ?? null;

export function buildKit(catalog: KitProduct[], input: KitInput): KitResult {
  const warnings: WarningKey[] = [];
  const of = (kind: ProductKind) => catalog.filter((p) => p.kind === kind && p.price > 0);

  // 1) Paneles: unidades para llegar a la potencia objetivo; se ordena por costo por Wp.
  const targetW = input.targetKwp * 1000;
  const panels = of("panel")
    .filter((p) => p.powerW)
    .map((p) => {
      const wattsPerUnit = p.powerW! * p.packQty;
      const qty = Math.max(1, Math.ceil(targetW / wattsPerUnit));
      return cand(p, qty, p.price / wattsPerUnit);
    })
    .sort((a, b) => a.perUnit - b.perUnit)
    .slice(0, MAX_ALTERNATIVES);
  if (!panels.length) warnings.push("no_panels");

  const panel = pick(panels, input.selection?.panelId);
  const panelUnits = panel ? Math.max(1, Math.round(input.selection?.panelQty ?? panel.qty)) : 0;
  const panelCount = panel ? panelUnits * panel.packQty : 0;
  const arrayW = panel ? panelCount * panel.powerW! : 0;
  if (panel) panel.qty = panelUnits, (panel.lineTotal = panel.price * panelUnits);

  // 2) Inversor: potencia AC que deje la relación DC/AC en [1,0 – 1,4], misma cantidad de fases y, si es híbrido, que alcance la carga a respaldar.
  const kind: ProductKind = hasBattery(input.systemType) ? "inverter_hybrid" : "inverter_ongrid";
  const needKw = (hasBattery(input.systemType) ? input.backupKw ?? 0 : 0) * 1000;
  const inverters = of(kind).filter(
    (p) => p.powerW && (p.phases == null || input.phases == null || p.phases === input.phases) && p.powerW >= needKw,
  );
  const ratio = (p: KitProduct) => (arrayW > 0 ? arrayW / (p.powerW! * p.packQty) : 0);
  const inRange = inverters.filter((p) => arrayW > 0 && ratio(p) >= DC_AC.min && ratio(p) <= DC_AC.max);
  let invList: Candidate[];
  if (inRange.length) {
    invList = inRange.map((p) => cand(p, 1, Math.abs(ratio(p) - DC_AC.target), { dcAc: ratio(p) }));
  } else {
    // Sin inversor en rango: se ofrecen los más cercanos y se avisa (el equipo lo valida en la visita).
    invList = inverters.map((p) => cand(p, 1, Math.abs(ratio(p) - DC_AC.target), { dcAc: ratio(p) }));
    if (invList.length) warnings.push(arrayW / Math.max(...invList.map((c) => c.powerW! * c.packQty)) > DC_AC.max ? "multi_inverter" : "inverter_out_of_range");
    else warnings.push("no_inverter");
  }
  invList = invList.sort((a, b) => a.perUnit - b.perUnit || a.price - b.price).slice(0, MAX_ALTERNATIVES);
  const inverter = pick(invList, input.selection?.inverterId);

  // 3) Baterías (híbrido): mismo voltaje que el bus del inversor; unidades para la capacidad nominal necesaria.
  let batteries: Slot | null = null;
  if (hasBattery(input.systemType)) {
    const volts = inverter?.voltageV ?? 48;
    const needWh = (input.backupNominalKwh ?? 0) * 1000;
    const list = of("battery")
      .filter((p) => p.capacityWh && p.voltageV === volts)
      .map((p) => {
        const whPerUnit = p.capacityWh! * p.packQty;
        return cand(p, Math.max(1, Math.ceil(needWh / whPerUnit)), p.price / whPerUnit);
      })
      .sort((a, b) => a.perUnit - b.perUnit)
      .slice(0, MAX_ALTERNATIVES);
    if (!list.length) warnings.push("no_battery");
    batteries = { candidates: list, selectedId: pick(list, input.selection?.batteryId)?.id ?? null };
  }

  // 4) Estructura: una por panel (o por grupo de paneles que soporta).
  const structures = of("structure")
    .map((p) => cand(p, Math.max(1, Math.ceil(panelCount / p.packQty)), p.price / p.packQty))
    .sort((a, b) => a.perUnit - b.perUnit)
    .slice(0, 6);
  if (panelCount && !structures.length) warnings.push("no_structure");

  const battery = batteries?.candidates.find((c) => c.id === batteries.selectedId) ?? null;
  const extras = buildExtras({ catalog, systemType: input.systemType, panelCount, inverter, battery, chosen: input.selection?.extras });

  return {
    panels: { candidates: panels, selectedId: panel?.id ?? null },
    inverter: { candidates: invList, selectedId: inverter?.id ?? null },
    batteries,
    structure: { candidates: structures, selectedId: pick(structures, input.selection?.structureId)?.id ?? null },
    extras,
    arrayKwp: Math.round(arrayW) / 1000,
    panelCount,
    warnings,
  };
}

/** Capacidad nominal necesaria a partir de energía útil (para el cliente que no usa sizing). */
export const nominalKwh = (usableKwh: number) => usableKwh / BATTERY_DOD;

export type Tier = "economic" | "balanced" | "premium";
export type Selection = NonNullable<KitInput["selection"]>;
export type KitOption = {
  tier: Tier;
  selection: Selection;
  total: number;
  arrayKwp: number;
  panelCount: number;
  panel: string | null;
  inverter: string | null;
  battery: string | null;
  warnings: WarningKey[];
};

const TIERS: [Tier, number][] = [
  ["economic", 0],
  ["balanced", 0.5],
  ["premium", 1],
];

const byCost = (a: Candidate, b: Candidate) => a.lineTotal - b.lineTotal || a.price - b.price;
const at = (list: Candidate[], f: number) => list[Math.round((list.length - 1) * f)];

/**
 * Tres kits completos para la misma necesidad: de cada componente se toma, dentro de los candidatos compatibles,
 * el de menor costo (económico), el del medio (equilibrado) o el de mayor costo (premium). Los componentes dependen
 * unos de otros (el inversor del campo de paneles, la batería del inversor), así que se fijan en cadena.
 */
export function buildOptions(catalog: KitProduct[], input: KitInput): KitOption[] {
  const options = TIERS.map(([tier, f]) => {
    const selection: Selection = {};
    let kit = buildKit(catalog, { ...input, selection });
    const panel = at([...kit.panels.candidates].sort(byCost), f);
    if (panel) selection.panelId = panel.id;
    kit = buildKit(catalog, { ...input, selection });
    // Sin inversor en rango se limita a los 3 más cercanos a la relación objetivo: el "premium" no puede ser uno de 28 kW para 4 kWp.
    const invPool = kit.inverter.candidates.some((c) => c.dcAc! >= DC_AC.min && c.dcAc! <= DC_AC.max) ? kit.inverter.candidates : kit.inverter.candidates.slice(0, 3);
    const inverter = at([...invPool].sort(byCost), f);
    if (inverter) selection.inverterId = inverter.id;
    kit = buildKit(catalog, { ...input, selection });
    const battery = kit.batteries ? at([...kit.batteries.candidates].sort(byCost), f) : undefined;
    if (battery) selection.batteryId = battery.id;
    kit = buildKit(catalog, { ...input, selection });
    const structure = at([...kit.structure.candidates].sort(byCost), f);
    if (structure) selection.structureId = structure.id;
    kit = buildKit(catalog, { ...input, selection });

    const slots = [kit.panels, kit.inverter, kit.batteries, kit.structure];
    const chosen = slots.map((s) => s?.candidates.find((c) => c.id === s.selectedId) ?? null);
    const extrasTotal = kit.extras.reduce((n, e) => n + (e.candidates.find((c) => c.id === e.selectedId)?.lineTotal ?? 0), 0);
    return {
      tier,
      selection,
      total: chosen.reduce((n, c) => n + (c?.lineTotal ?? 0), 0) + extrasTotal,
      arrayKwp: kit.arrayKwp,
      panelCount: kit.panelCount,
      panel: chosen[0]?.name ?? null,
      inverter: chosen[1]?.name ?? null,
      battery: chosen[2]?.name ?? null,
      warnings: kit.warnings,
    } satisfies KitOption;
  });
  // Si el catálogo es tan chico que dos niveles dan el mismo kit, no se repite.
  return options.filter((o, i) => options.findIndex((p) => JSON.stringify(p.selection) === JSON.stringify(o.selection)) === i);
}

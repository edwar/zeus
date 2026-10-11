import test from "node:test";
import assert from "node:assert/strict";
import { buildKit, type KitProduct } from "../src/lib/kit";

const base = { slug: "x", manufacturer: "M", category: null, image: null, packQty: 1, powerW: null, capacityWh: null, voltageV: null, phases: null };
const p = (o: Partial<KitProduct> & Pick<KitProduct, "id" | "kind" | "price" | "name">): KitProduct => ({ ...base, ...o });

const catalog: KitProduct[] = [
  p({ id: "p550", name: "Panel 550W", kind: "panel", powerW: 550, price: 400_000 }), // 727 $/Wp
  p({ id: "p620", name: "Panel 620W", kind: "panel", powerW: 620, price: 420_000 }), // 677 $/Wp  ← más barato por W
  p({ id: "pk6", name: "Pack 6 ud 710W", kind: "panel", powerW: 710, packQty: 6, price: 3_900_000 }), // 915 $/Wp
  p({ id: "i3", name: "On-grid 3000W", kind: "inverter_ongrid", powerW: 3000, phases: 2, price: 2_000_000 }),
  p({ id: "i5", name: "On-grid 5000W", kind: "inverter_ongrid", powerW: 5000, phases: 2, price: 2_500_000 }),
  p({ id: "i5t", name: "On-grid 5000W trifásico", kind: "inverter_ongrid", powerW: 5000, phases: 3, price: 2_400_000 }),
  p({ id: "h5", name: "Híbrido 5000W 48V", kind: "inverter_hybrid", powerW: 5000, voltageV: 48, price: 7_000_000 }),
  p({ id: "h2", name: "Híbrido 2000W 24V", kind: "inverter_hybrid", powerW: 2000, voltageV: 24, price: 3_000_000 }),
  p({ id: "b48", name: "Batería 48V 2.4kWh", kind: "battery", capacityWh: 2400, voltageV: 48, price: 2_400_000 }),
  p({ id: "b24", name: "Batería 24V 2.4kWh", kind: "battery", capacityWh: 2400, voltageV: 24, price: 1_000_000 }),
  p({ id: "s1", name: "Estructura 1 panel", kind: "structure", packQty: 1, price: 300_000 }),
  p({ id: "s4", name: "Estructura 4 paneles", kind: "structure", packQty: 4, price: 900_000 }), // 225.000 por panel ← más barata
  p({ id: "x", name: "Sin precio", kind: "panel", powerW: 700, price: 0 }),
];

test("paneles: ordena por costo por Wp, calcula unidades y respeta packs", () => {
  const r = buildKit(catalog, { systemType: "ongrid", phases: 2, targetKwp: 3 });
  assert.equal(r.panels.selectedId, "p620"); // 3000/620 → 5 paneles
  assert.equal(r.panels.candidates[0].qty, 5);
  assert.equal(r.panelCount, 5);
  assert.equal(r.arrayKwp, 3.1);
  const pack = r.panels.candidates.find((c) => c.id === "pk6")!;
  assert.equal(pack.qty, 1); // 3000/(710×6) → 1 pack = 6 paneles
  assert.ok(!r.panels.candidates.some((c) => c.id === "x"), "producto sin precio excluido");
});

test("inversor on-grid: relación DC/AC en rango y fases compatibles", () => {
  const r = buildKit(catalog, { systemType: "ongrid", phases: 2, targetKwp: 3 }); // array 3,1 kWp
  assert.equal(r.inverter.selectedId, "i3"); // 3100/3000 = 1,03; i5 daría 0,62 (fuera de rango)
  assert.deepEqual(r.inverter.candidates.map((c) => c.id), ["i3"]);
  assert.equal(r.batteries, null);
  assert.deepEqual(r.warnings, []);
});

test("fases: un inversor trifásico no se ofrece a una conexión bifásica", () => {
  const r = buildKit(catalog, { systemType: "ongrid", phases: 2, targetKwp: 6 });
  assert.ok(!r.inverter.candidates.some((c) => c.id === "i5t"));
  const t = buildKit(catalog, { systemType: "ongrid", phases: 3, targetKwp: 6 });
  assert.ok(t.inverter.candidates.some((c) => c.id === "i5t"));
});

test("cambiar el panel recalcula el inversor aguas abajo", () => {
  const r = buildKit(catalog, { systemType: "ongrid", phases: 2, targetKwp: 3, selection: { panelId: "p550" } }); // 6 × 550 = 3,3 kWp
  assert.equal(r.arrayKwp, 3.3);
  assert.equal(r.inverter.selectedId, "i3"); // 3300/3000 = 1,10
});

test("la cantidad editada por el usuario cambia el campo FV", () => {
  const r = buildKit(catalog, { systemType: "ongrid", phases: 2, targetKwp: 3, selection: { panelId: "p620", panelQty: 8 } }); // 4,96 kWp
  assert.equal(r.panelCount, 8);
  assert.equal(r.inverter.selectedId, "i5"); // 4960/5000 = 0,99 → en rango (~1,0); i3 daría 1,65
});

test("híbrido: batería con el voltaje del inversor y unidades por capacidad", () => {
  const r = buildKit(catalog, { systemType: "hybrid", phases: null, targetKwp: 4, backupKw: 2, backupNominalKwh: 10 });
  assert.equal(r.inverter.selectedId, "h5"); // carga 2 kW ≤ 5 kW; 4,03/5 = 0,81 fuera de rango → se ofrece el más cercano con aviso
  assert.ok(r.warnings.includes("inverter_out_of_range"));
  assert.deepEqual(r.batteries!.candidates.map((c) => c.id), ["b48"]); // la de 24 V no es compatible con un bus de 48 V
  assert.equal(r.batteries!.candidates[0].qty, 5); // 10 kWh / 2,4 → 5
});

test("híbrido: el inversor debe soportar la carga a respaldar", () => {
  const r = buildKit(catalog, { systemType: "hybrid", phases: null, targetKwp: 2, backupKw: 3 });
  assert.ok(!r.inverter.candidates.some((c) => c.id === "h2")); // 2 kW < 3 kW
});

test("estructuras: cantidad por paneles que soporta y orden por costo por panel", () => {
  const r = buildKit(catalog, { systemType: "ongrid", phases: 2, targetKwp: 3 }); // 5 paneles
  assert.equal(r.structure.selectedId, "s4");
  assert.equal(r.structure.candidates[0].qty, 2); // ceil(5/4)
});

test("catálogo vacío: avisos en vez de errores", () => {
  const r = buildKit([], { systemType: "hybrid", phases: 2, targetKwp: 3, backupKw: 1, backupNominalKwh: 5 });
  assert.deepEqual(r.warnings.sort(), ["no_battery", "no_inverter", "no_panels"]);
  assert.equal(r.panelCount, 0);
});

test("opciones: tres niveles de costo creciente, sin repetir kits idénticos", async () => {
  const { buildOptions } = await import("../src/lib/kit");
  const many = [
    ...catalog,
    p({ id: "p700", name: "Panel 700W", kind: "panel", powerW: 700, price: 520_000 }),
    p({ id: "i4", name: "On-grid 4000W", kind: "inverter_ongrid", powerW: 4000, phases: 2, price: 2_600_000 }),
  ];
  const o = buildOptions(many, { systemType: "ongrid", phases: 2, targetKwp: 3 });
  assert.deepEqual(o.map((x) => x.tier), ["economic", "balanced", "premium"]);
  assert.ok(o[0].total <= o[1].total && o[1].total <= o[2].total);
  assert.equal(o[0].selection.panelId, "p620");
  // Un catálogo con una sola opción por componente colapsa a un único kit.
  const one = buildOptions(catalog.filter((c) => ["p620", "i3", "s1"].includes(c.id)), { systemType: "ongrid", phases: 2, targetKwp: 3 });
  assert.equal(one.length, 1);
});

test("aislado: usa inversor híbrido y baterías del mismo voltaje", () => {
  const r = buildKit(catalog, { systemType: "offgrid", phases: null, targetKwp: 4, backupKw: 2, backupNominalKwh: 6 });
  assert.equal(r.inverter.selectedId, "h5");
  assert.ok(r.batteries && r.batteries.selectedId === "b48");
});

// --- Complementos de instalación -------------------------------------------------------------
const bos: KitProduct[] = [
  p({ id: "c6r", name: "Cable Solar 1*6mm2 Rojo 1500VDC", kind: "cable_dc", price: 6_200 }),
  p({ id: "c6n", name: "Cable Solar 1*6mm2 Negro 1500VDC", kind: "cable_dc", price: 6_200 }),
  p({ id: "c10n", name: "Cable Solar 1*10mm2 Negro 1500VDC", kind: "cable_dc", price: 11_300 }),
  p({ id: "c50n", name: "Cable Solar 1*50mm2 Negro1000VDC", kind: "cable_dc", price: 43_200 }),
  p({ id: "c50v", name: "Cable Solar 1*50mm2 Verde1000VDC", kind: "cable_dc", price: 43_200 }),
  p({ id: "mc4", name: "Conector MC4 para Paneles Solares 4/6mm2 1500VDC", kind: "connector", price: 6_300 }),
  p({ id: "lug50", name: "Terminal de Ojo Cable 50mm - Ojo 10mm", kind: "terminal", price: 4_900 }),
  p({ id: "lug16", name: "Terminal de Ojo Cable 16mm - Ojo 10mm", kind: "terminal", price: 2_600 }),
  p({ id: "bcy", name: "Cables Pylontech LV Batería-Inversor", kind: "battery_cable", manufacturer: "Pylontech", price: 106_200 }),
  p({ id: "cab80", name: "Gabinete 80*60*60cm para Baterías Solares", kind: "cabinet", price: 892_500 }),
  p({ id: "cab150", name: "Gabinete 150*60*60cm para Baterías Solares", kind: "cabinet", price: 1_427_500 }),
  p({ id: "tray", name: "Bandeja Tipo Rack para Gabinete de Baterías", kind: "rack_tray", price: 125_000 }),
  p({ id: "mon", name: "Monitorización WiFi Inversor PH Volt", kind: "monitoring", price: 90_000 }),
  p({ id: "mon2", name: "Monitorización Growatt Shine Wifi-F", kind: "monitoring", price: 226_800 }),
  p({ id: "kit3", name: "Kit Material Eléctrico 3KW48V110V-MPPT 25A LITIO", kind: "electrical_kit", price: 1_200_000 }),
  p({ id: "kit10", name: "Kit Material Electrico Hibrido 10KW 40A", kind: "electrical_kit", price: 4_000_000 }),
];
const full: KitProduct[] = [
  ...catalog.filter((c) => !["h5", "h2", "b24", "b48"].includes(c.id)),
  p({ id: "phv", name: "Inversor Cargador Rack 3000W 48V EOS3000", kind: "inverter_hybrid", manufacturer: "PHVolt", powerW: 3000, voltageV: 48, price: 3_000_000 }),
  p({ id: "pyl", name: "Batería Litio Pylontech US2000C 48V 2.4kWh", kind: "battery", manufacturer: "Pylontech", capacityWh: 2400, voltageV: 48, price: 2_400_000 }),
  ...bos,
];

test("complementos: 6 paneles → 30 m por polaridad y 4 MC4, como un kit real", () => {
  const r = buildKit(full, { systemType: "offgrid", phases: null, targetKwp: 3.6, backupKw: 3, backupNominalKwh: 9.6 });
  const by = Object.fromEntries(r.extras.map((e) => [e.key, e.candidates.find((c) => c.id === e.selectedId)!]));
  assert.equal(r.panelCount, 6);
  assert.equal(by.cableRed.id, "c6r");
  assert.equal(by.cableRed.qty, 30);
  assert.equal(by.cableBlack.qty, 30);
  assert.equal(by.mc4.qty, 4);
});

test("complementos: banco de baterías con cable de 50 mm², terminales, gabinete y bandejas por batería", () => {
  const r = buildKit(full, { systemType: "offgrid", phases: null, targetKwp: 3.6, backupKw: 3, backupNominalKwh: 9.6 });
  const by = Object.fromEntries(r.extras.map((e) => [e.key, e.candidates.find((c) => c.id === e.selectedId)!]));
  assert.equal(by.bankNeg.id, "c50n"); // 3000 W / 48 V = 62 A
  assert.equal(by.bankPos.id, "c50v");
  assert.equal(by.lugs.id, "lug50");
  assert.equal(by.lugs.qty, 4);
  assert.equal(by.batteryCable.qty, 2);
  assert.equal(by.trays.qty, r.batteries!.candidates.find((c) => c.id === r.batteries!.selectedId)!.qty); // una por batería
  assert.equal(by.cabinet.id, "cab150"); // 4 baterías no caben en 80 cm
  assert.equal(by.monitoring.id, "mon"); // solo el monitor de la marca del inversor
});

test("complementos: el cable de batería solo es de su marca y sin baterías no hay banco", () => {
  const noPyl = full.map((x) => (x.id === "pyl" ? { ...x, manufacturer: "Otra", name: "Batería Litio Otra 48V 2.4kWh" } : x));
  const r = buildKit(noPyl, { systemType: "offgrid", phases: null, targetKwp: 3.6, backupKw: 3, backupNominalKwh: 9.6 });
  assert.ok(!r.extras.some((e) => e.key === "batteryCable"));
  assert.ok(!r.extras.some((e) => e.key === "cabinet"));
  const g = buildKit(full, { systemType: "ongrid", phases: 2, targetKwp: 3 });
  assert.deepEqual(g.extras.map((e) => e.key).sort(), ["cableBlack", "cableRed", "electricalKit", "mc4"].sort());
});

test("complementos: el total de las opciones incluye los complementos", async () => {
  const { buildOptions } = await import("../src/lib/kit");
  const o = buildOptions(full, { systemType: "ongrid", phases: 2, targetKwp: 3 });
  const k = buildKit(full, { systemType: "ongrid", phases: 2, targetKwp: 3, selection: o[0].selection });
  const extras = k.extras.reduce((n, e) => n + e.candidates.find((c) => c.id === e.selectedId)!.lineTotal, 0);
  assert.ok(extras > 0 && o[0].total >= extras);
});

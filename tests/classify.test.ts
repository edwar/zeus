import test from "node:test";
import assert from "node:assert/strict";
import { classifyProduct } from "../src/lib/catalog/classify";

const u = (slug: string) => `https://autosolar.co/${slug}/x`;
const c = (name: string, slug: string, specs = []) => classifyProduct({ name, sourceUrl: u(slug), specs });

test("panel simple y bifacial", () => {
  assert.deepEqual(c("Panel Solar Bifacial 620W N-Type Tensite", "paneles-solares"), { kind: "panel", powerW: 620, capacityWh: null, voltageV: null, phases: null, packQty: 1 });
  assert.equal(c("Panel Solar Monocristalino 240W Tensite", "paneles-solares").powerW, 240);
});

test("pack de paneles: potencia por unidad y cantidad del pack", () => {
  const r = c("Pack 6 ud paneles solares Bucaramanga Bifacial 710W N-Type Tensite", "paneles-solares");
  assert.equal(r.powerW, 710);
  assert.equal(r.packQty, 6);
});

test("inversores: W, kW y modelos con TL", () => {
  assert.equal(c("Inversor On Grid 6000W Bifasico SAJ R6-6K-S2-X", "inversores-on-grid-bifasicos").powerW, 6000);
  assert.equal(c("Inversor On Grid Growatt MIN 3000TL-X2", "inversores-on-grid-bifasicos").powerW, 3000);
  const h = c("Inversor Híbrido 10KW 48V 80A Infinisolar", "inversores-solares-hibridos");
  assert.equal(h.kind, "inverter_hybrid");
  assert.equal(h.powerW, 10000);
  assert.equal(h.voltageV, 48);
});

test("fases: por categoría y por nombre", () => {
  assert.equal(c("Inversor On Grid 6000W Bifasico SAJ", "inversores-on-grid-bifasicos").phases, 2);
  assert.equal(c("Inversor On Grid 20000W Growatt", "inversores-on-grid-trifasicos").phases, 3);
  assert.equal(c("Inversor Hibrido Trifasico 10000W Deye", "inversores-solares-hibridos").phases, 3);
  assert.equal(c("Inversor Hibrido 5000W X", "inversores-solares-hibridos").phases, null);
});

test("baterías de litio: kWh con coma o punto, voltaje y packs", () => {
  const a = c("Pack 5 ud Baterías Ibagué de litio 48V 2.4kWh Pylontech", "baterias-de-litio-48v");
  assert.deepEqual([a.capacityWh, a.voltageV, a.packQty], [2400, 48, 5]);
  const b = c("Batería Litio Felicity Solar 8,75kWh 48V 171A FLA48171-EU", "baterias-de-litio-48v");
  assert.deepEqual([b.capacityWh, b.voltageV], [8750, 48]);
  assert.equal(c("BMS Batería de litio FLH48100UG1 5,12kWh 51.2V", "baterias-de-litio").voltageV, 48);
});

test("baterías GEL: capacidad = Ah × V", () => {
  const r = c("Batería GEL 12V 100Ah Tensite", "baterias-gel-12v");
  assert.deepEqual([r.kind, r.voltageV, r.capacityWh], ["battery", 12, 1200]);
});

test("la categoría manda: un accesorio 'de baterías' NO es una batería", () => {
  assert.equal(c("Gabinete 120*60*60cm para Baterías Solares", "accesorios-de-baterias").kind, "cabinet");
  assert.equal(c("Battery Monitor BMV-712 Smart", "accesorios-de-baterias").kind, "other");
  assert.equal(c("Cables Pylontech LV Batería-Inversor", "accesorios-de-baterias").kind, "battery_cable");
  assert.equal(c("Monitorización Growatt Shine Wifi-X", "accesorios-de-inversores").kind, "monitoring");
});

test("estructuras vs accesorios de estructuras", () => {
  assert.equal(c("Estructura Cubierta Metálica Trapezoidal 1 panel solar Falcat", "estructura-cubierta-metalica").kind, "structure");
  assert.equal(c("M Clamp falcat (Intermedio)", "accesorios-de-estructuras").kind, "other");
});

test("potencia desde la ficha cuando el nombre no la trae", () => {
  const specs = [{ label: "Potencia nominal de salida AC", value: "10000W" }, { label: "Potencia máxima de entrada FV", value: "13000W" }];
  assert.equal(c("Inversor Híbrido Deye SUN", "inversores-solares-hibridos", specs as never).powerW, 10000);
});

test("sin URL conocida es 'other'", () => {
  assert.equal(classifyProduct({ name: "Panel 500W" }).kind, "other");
});

test("estructura: paquetes de paneles que cubre", () => {
  assert.equal(c("Estructura Cubierta Metálica Trapezoidal 1 panel solar Falcat", "estructura-cubierta-metalica").packQty, 1);
  assert.equal(c("Estructura Suelo 4 paneles solares", "estructura-suelo").packQty, 4);
});

test("complementos de instalación se reconocen por el nombre", async () => {
  const { installKindFromName } = await import("../src/lib/catalog/classify");
  assert.equal(installKindFromName("Cable Solar 1*6mm2 Rojo 1500VDC"), "cable_dc");
  assert.equal(installKindFromName("Conector MC4 para Paneles Solares 4/6mm2 1500VDC"), "connector");
  assert.equal(installKindFromName("Conector MC4-Y 2-1 para Paneles Solares 4/6mm2 1500VDC"), "other");
  assert.equal(installKindFromName("Terminal de Ojo Cable 50mm - Ojo 10mm"), "terminal");
  assert.equal(installKindFromName("Cables Pylontech LV Batería-Inversor"), "battery_cable");
  assert.equal(installKindFromName("Cable de Interconexión de Baterías"), "other");
  assert.equal(installKindFromName("Gabinete 150*60*60cm para Baterías Solares"), "cabinet");
  assert.equal(installKindFromName("Bandeja Tipo Rack para Gabinete de Baterías"), "rack_tray");
  assert.equal(installKindFromName("Monitorización WiFi Inversor PH Volt"), "monitoring");
  assert.equal(installKindFromName("Kit Material Eléctrico 3KW48V110V-MPPT 25A LITIO"), "electrical_kit");
  assert.equal(installKindFromName("Breaker AC 3P 80A"), "other");
});

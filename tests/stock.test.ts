import assert from "node:assert/strict";
import { test } from "node:test";
import { effectiveInStock, isLow, projectMargin, weightedAvg } from "../src/lib/stock-core";
import { can } from "../src/lib/roles";

test("costo promedio ponderado: mezcla lo que hay con lo que entra", () => {
  assert.equal(weightedAvg(0, null, 10, 100), 100);
  assert.equal(weightedAvg(10, 100, 10, 200), 150);
  assert.equal(weightedAvg(3, 100, 1, 200), 125);
  assert.equal(weightedAvg(-2, 100, 5, 80), 80); // con existencias negativas no arrastra el costo viejo
  assert.equal(weightedAvg(10, null, 5, 90), 90);
});

test("stock bajo incluye agotado y negativo", () => {
  assert.equal(isLow(5, 5), true);
  assert.equal(isLow(6, 5), false);
  assert.equal(isLow(0, 0), true);
  assert.equal(isLow(-1, 0), true);
  assert.equal(isLow(1, 0), false);
});

test("disponibilidad: unidades propias mandan; si no, el proveedor (solo Autosolar) o nada", () => {
  assert.equal(effectiveInStock({ source: "autosolar", inStock: false }, 3), true); // el proveedor no lo tiene, pero tú sí
  assert.equal(effectiveInStock({ source: "autosolar", inStock: true }, 0), true); // se acabó el tuyo: vuelve al proveedor
  assert.equal(effectiveInStock({ source: "autosolar", inStock: false }, 0), false);
  assert.equal(effectiveInStock({ source: "manual", inStock: true }, 0), false); // manual con inventario: sin unidades, agotado
  assert.equal(effectiveInStock({ source: "manual", inStock: true }, null), true); // manual sin inventario: lo que diga el producto
  assert.equal(effectiveInStock({ source: "autosolar", inStock: true }, null), true);
});

test("margen del kit: suma lo conocido y avisa si falta algo", () => {
  const m = projectMargin([{ qty: 2, unitPrice: 1000, unitCost: 700 }, { qty: 1, unitPrice: 500, unitCost: 400 }]);
  assert.deepEqual(m, { revenue: 2500, cost: 1800, margin: 700, pct: 28, incomplete: false });
  const partial = projectMargin([{ qty: 1, unitPrice: 1000, unitCost: 600 }, { qty: 1, unitPrice: 300, unitCost: null }, { qty: 1, unitPrice: null, unitCost: 50 }]);
  assert.equal(partial.margin, 400);
  assert.equal(partial.incomplete, true);
  assert.equal(projectMargin([]).incomplete, true);
  assert.equal(projectMargin([]).pct, null);
});

test("el inventario y sus costos son de gestión y admin; el equipo de instalación no", () => {
  assert.equal(can("admin", "stock"), true);
  assert.equal(can("gestion", "stock"), true);
  assert.equal(can("equipo", "stock"), false);
  assert.equal(can(null, "stock"), false);
});

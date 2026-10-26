import { test } from "node:test";
import assert from "node:assert/strict";
import { invalidRows, newRow, rowKwh, totalKwh } from "../src/lib/appliances";

test("la clase A consume menos que la D y la G más, en un equipo con etiqueta", () => {
  const a = { ...newRow("fridgex", "fridge"), cls: "A" as const };
  const d = { ...newRow("fridgex", "fridge"), cls: "D" as const };
  const g = { ...newRow("fridgex", "fridge"), cls: "G" as const };
  assert.ok(rowKwh(a) < rowKwh(d) && rowKwh(d) < rowKwh(g));
  assert.equal(rowKwh(d), 45);
});

test("la cantidad multiplica el consumo", () => {
  assert.equal(rowKwh({ ...newRow("bulbx", "bulb"), qty: "10" }), 15);
});

test("un equipo sin etiqueta ignora la clase", () => {
  assert.equal(rowKwh({ ...newRow("microwavex", "microwave"), cls: "A" }), rowKwh({ ...newRow("microwavex", "microwave"), cls: "G" }));
});

test("el consumo escrito de la etiqueta reemplaza la tabla (acepta coma decimal)", () => {
  assert.equal(rowKwh({ ...newRow("fridgex", "fridge"), cls: "G", label: "18,67" }), 18.67);
  assert.equal(rowKwh({ ...newRow("fridgex", "fridge"), qty: "2", label: "18.67" }), 37.34);
});

test("el total suma las filas y las cantidades inválidas no cuentan pero se avisan", () => {
  const ok = { ...newRow("fridgex", "fridge"), cls: "D" as const };
  const bad = { ...newRow("tvx", "tv"), qty: "0" };
  const frac = { ...newRow("tvy", "tv"), qty: "1.5" };
  assert.equal(totalKwh([ok, bad, frac]), 45);
  assert.deepEqual([...invalidRows([ok, bad, frac])].sort(), [bad.id, frac.id].sort());
});

import test from "node:test";
import assert from "node:assert/strict";
import { entityType, parsePct, termBucket, usuryFromIbc, weightedByEntity } from "../src/lib/finance/rates-core";

const row = (nombre_entidad: string, tasa: number, monto: number, n: number) => ({ nombre_entidad, nombre_tipo_entidad: "BC-ESTABLECIMIENTO BANCARIO", tasa_efectiva_promedio: String(tasa), montos_desembolsados: String(monto), numero_de_creditos: String(n) });

test("el plazo en meses se asigna al tramo de la Superfinanciera", () => {
  assert.equal(termBucket(12), "Entre 31 días y 1 año");
  assert.equal(termBucket(24), "Más de 1 año y hasta 3 años");
  assert.equal(termBucket(36), "Más de 1 año y hasta 3 años");
  assert.equal(termBucket(48), "Más de 3 años y hasta 5 años");
  assert.equal(termBucket(60), "Más de 3 años y hasta 5 años");
  assert.equal(termBucket(84), "Más de 5 años y hasta 7 años");
});

test("tasa ponderada por monto, ordenada de menor a mayor", () => {
  const out = weightedByEntity([row("Banco A", 20, 3_000_000, 3), row("Banco A", 30, 1_000_000, 3), row("Banco B", 15, 5_000_000, 10)]);
  assert.deepEqual(out.map((b) => [b.name, b.rateEA, b.credits]), [["Banco B", 15, 10], ["Banco A", 22.5, 6]]);
});

test("se descartan entidades con pocos créditos y datos inválidos", () => {
  const out = weightedByEntity([row("Pocos", 10, 1_000_000, 2), row("Roto", 0, 1_000_000, 10), row("Raro", 250, 1_000_000, 10), row("Ok", 18, 2_000_000, 5)]);
  assert.deepEqual(out.map((b) => b.name), ["Ok"]);
});

test("usura = 1,5 × interés bancario corriente; el texto del porcentaje se interpreta", () => {
  assert.equal(parsePct("19.06%"), 19.06);
  assert.equal(usuryFromIbc(19.06), 28.59);
});

test("tipo de entidad legible", () => {
  assert.equal(entityType("BC-ESTABLECIMIENTO BANCARIO"), "Establecimiento Bancario");
  assert.equal(entityType("CO-COOPERATIVAS DE CARÁCTER FINANCIERO"), "Cooperativas de Carácter Financiero");
  assert.equal(entityType(undefined), "");
});

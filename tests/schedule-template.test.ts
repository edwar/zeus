import test from "node:test";
import assert from "node:assert/strict";
import { buildSchedule } from "../src/lib/schedule-template";

const labels = (r: ReturnType<typeof buildSchedule>) => r.map((m) => m.label);

test("conectado a la red: sin baterías en el inversor y con trámite del operador", () => {
  const r = buildSchedule({ systemType: "ongrid", kwp: 3, start: "2026-10-12" });
  assert.ok(labels(r).includes("Trámite con el operador de red"));
  assert.ok(labels(r).includes("Inversor y protecciones"));
  assert.equal(r.length, 9);
});

test("aislado: sin trámite con el operador y con baterías", () => {
  const r = buildSchedule({ systemType: "offgrid", kwp: 3, start: "2026-10-12" });
  assert.ok(!labels(r).includes("Trámite con el operador de red"));
  assert.ok(labels(r).includes("Inversor, protecciones y baterías"));
  assert.equal(r.length, 8);
});

test("las fechas son consecutivas y el trámite corre en paralelo con los materiales", () => {
  const r = buildSchedule({ systemType: "hybrid", kwp: 3, start: "2026-10-12" });
  const by = Object.fromEntries(r.map((m) => [m.label, m]));
  assert.equal(by["Visita técnica"].startDate, "2026-10-12");
  assert.equal(by["Diseño y planos"].startDate, "2026-10-13");
  // materiales y trámite empiezan el mismo día (tras el diseño)
  assert.equal(by["Compra y entrega de materiales"].startDate, by["Trámite con el operador de red"].startDate);
  // las pruebas esperan al trámite (el más largo): empieza el día 13 desde el inicio
  assert.equal(by["Pruebas y puesta en marcha"].startDate, "2026-10-25");
});

test("sistemas grandes llevan más días de montaje; el idioma cambia las etiquetas", () => {
  const small = buildSchedule({ systemType: "ongrid", kwp: 3, start: "2026-10-12" });
  const big = buildSchedule({ systemType: "ongrid", kwp: 8, start: "2026-10-12", lang: "en" });
  assert.equal(small.find((m) => m.label === "Montaje de estructura")!.len, 1);
  assert.equal(big.find((m) => m.label === "Mounting structure")!.len, 2);
});

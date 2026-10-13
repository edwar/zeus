import test from "node:test";
import assert from "node:assert/strict";
import { checklistComplete, checklistFor } from "../src/lib/field-checklist";
import { applyAll, applyOp, checklistProgress, clampAt, enqueue, opSchema, opTarget, shouldApply, syncBody, type FieldProject, type Op } from "../src/lib/field-sync";

const base: FieldProject = {
  id: "p1", name: "Sistema 4 kWp", client: "Ana", town: "Girardot", kwp: 4, stage: "install",
  checks: [{ key: "site", labelEs: "Sitio", labelEn: "Site", order: 0, done: false, doneAt: null, doneBy: null, note: null }, { key: "panels", labelEs: "Paneles", labelEn: "Panels", order: 1, done: false, doneAt: null, doneBy: null, note: null }],
  materials: [{ id: "m1", name: "Panel", qty: 8, ready: false }],
  milestones: [{ id: "h1", label: "Montaje", startDate: "2026-10-01", len: 2, done: 0 }],
  photos: [], handover: null,
};
const at = "2026-10-12T15:00:00.000-05:00";
const png = "data:image/png;base64,iVBORw0KGgo=";

test("checklist: cambia con el tipo de sistema (baterías y trámite de red)", () => {
  const keys = (s: string) => checklistFor(s).map((c) => c.key);
  assert.ok(keys("ongrid").includes("grid") && !keys("ongrid").includes("batteries"));
  assert.ok(keys("hybrid").includes("grid") && keys("hybrid").includes("batteries"));
  assert.ok(!keys("offgrid").includes("grid") && keys("offgrid").includes("batteries"));
  assert.deepEqual(keys("loquesea"), keys("ongrid"), "un tipo desconocido usa el más simple");
  assert.deepEqual(keys(null as unknown as string), keys("ongrid"));
  for (const s of ["ongrid", "hybrid", "offgrid"]) {
    const list = checklistFor(s);
    assert.equal(new Set(list.map((c) => c.key)).size, list.length, "claves únicas");
    assert.ok(list.every((c) => /^[a-z][a-z0-9_]{1,30}$/.test(c.key) && c.es && c.en));
  }
});

test("checklist: solo está completo cuando todos los pasos están hechos (y no si no hay pasos)", () => {
  assert.ok(!checklistComplete([]));
  assert.ok(!checklistComplete([{ done: true }, { done: false }]));
  assert.ok(checklistComplete([{ done: true }, { done: true }]));
  assert.deepEqual(checklistProgress([{ done: true }, { done: false }, { done: true }]), { done: 2, total: 3 });
});

test("operaciones: el formato se valida (ids, hora con zona, porcentaje, firma PNG)", () => {
  const ok = { id: "op-0001-aaaa", type: "check", projectId: "p1", key: "site", done: true, at };
  assert.ok(opSchema.safeParse(ok).success);
  assert.ok(!opSchema.safeParse({ ...ok, id: "x" }).success, "id demasiado corto");
  assert.ok(!opSchema.safeParse({ ...ok, id: "op 0001 aaaa" }).success);
  assert.ok(!opSchema.safeParse({ ...ok, at: "ayer" }).success);
  assert.ok(!opSchema.safeParse({ ...ok, key: "Site; DROP" }).success);
  assert.ok(!opSchema.safeParse({ ...ok, type: "borrar" }).success);
  assert.ok(opSchema.safeParse({ id: "op-0002-aaaa", type: "progress", projectId: "p1", mid: "h1", done: 100, at }).success);
  assert.ok(!opSchema.safeParse({ id: "op-0002-aaaa", type: "progress", projectId: "p1", mid: "h1", done: 101, at }).success);
  const hand = { id: "op-0003-aaaa", type: "handover", projectId: "p1", signerName: "Ana Pérez", signature: png, at };
  assert.ok(opSchema.safeParse(hand).success);
  assert.ok(!opSchema.safeParse({ ...hand, signature: "data:image/svg+xml;base64,PHN2Zz4=" }).success, "una firma SVG no pasa");
  assert.ok(!opSchema.safeParse({ ...hand, signature: "javascript:alert(1)" }).success);
  assert.ok(!opSchema.safeParse({ ...hand, signature: `data:image/png;base64,${"A".repeat(150_000)}` }).success, "firma enorme");
  assert.ok(!opSchema.safeParse({ ...hand, signerName: "A" }).success);
  assert.ok(!syncBody.safeParse({ ops: [] }).success);
  assert.ok(!syncBody.safeParse({ ops: Array.from({ length: 201 }, (_, i) => ({ ...ok, id: `op-${String(i).padStart(6, "0")}` })) }).success);
});

test("cola: dos operaciones sobre lo mismo se reemplazan; sobre cosas distintas se conservan", () => {
  const a: Op = { id: "op-a-000001", type: "check", projectId: "p1", key: "site", done: true, at };
  const b: Op = { id: "op-b-000001", type: "check", projectId: "p1", key: "site", done: false, at };
  const c: Op = { id: "op-c-000001", type: "check", projectId: "p1", key: "panels", done: true, at };
  const q = enqueue(enqueue(enqueue([], a), c), b);
  assert.deepEqual(q.map((o) => o.id), ["op-c-000001", "op-b-000001"], "marcar y desmarcar deja solo lo último");
  assert.notEqual(opTarget(a), opTarget(c));
  assert.equal(opTarget(a), opTarget(b));
  assert.notEqual(opTarget({ ...a, projectId: "p2" }), opTarget(a));
});

test("aplicar en el teléfono: el paso, el material y el avance cambian al instante, sin tocar otros proyectos", () => {
  const p1 = applyOp(base, { id: "op-a-000001", type: "check", projectId: "p1", key: "site", done: true, note: "Techo de teja", at }, "Luis");
  assert.deepEqual(p1.checks[0], { ...base.checks[0], done: true, doneAt: at, doneBy: "Luis", note: "Techo de teja" });
  assert.equal(p1.checks[1].done, false);
  const p2 = applyOp(p1, { id: "op-b-000001", type: "check", projectId: "p1", key: "site", done: false, at }, "Luis");
  assert.deepEqual([p2.checks[0].done, p2.checks[0].doneAt, p2.checks[0].doneBy, p2.checks[0].note], [false, null, null, "Techo de teja"], "desmarcar limpia quién y cuándo, la nota se conserva");
  assert.equal(applyOp(base, { id: "op-c-000001", type: "material", projectId: "p1", mid: "m1", ready: true, at }, "Luis").materials[0].ready, true);
  assert.equal(applyOp(base, { id: "op-d-000001", type: "progress", projectId: "p1", mid: "h1", done: 60, at }, "Luis").milestones[0].done, 60);
  assert.deepEqual(applyOp(base, { id: "op-e-000001", type: "handover", projectId: "p1", signerName: "Ana", signature: png, at }, "Luis").handover, { signedAt: at, signerName: "Ana" });
  assert.equal(applyOp(base, { id: "op-f-000001", type: "check", projectId: "otro", key: "site", done: true, at }, "Luis"), base, "otro proyecto: no cambia");
});

test("lo pendiente se vuelve a aplicar sobre lo que baja del servidor", () => {
  const fresh = { ...base, checks: base.checks.map((c) => ({ ...c })) };
  const q: Op[] = [{ id: "op-a-000001", type: "check", projectId: "p1", key: "panels", done: true, at }];
  const [p] = applyAll([fresh], q, "Luis");
  assert.equal(p.checks[1].done, true);
  assert.equal(fresh.checks[1].done, false, "no muta el original");
});

test("gana la última escritura: igual o más reciente se aplica, más vieja no", () => {
  const t = (s: string) => new Date(s);
  assert.ok(shouldApply(null, t("2026-10-12T10:00:00Z")));
  assert.ok(shouldApply(t("2026-10-12T10:00:00Z"), t("2026-10-12T10:00:01Z")));
  assert.ok(shouldApply(t("2026-10-12T10:00:00Z"), t("2026-10-12T10:00:00Z")), "empate: se aplica (reenviar lo mismo no rompe nada)");
  assert.ok(!shouldApply(t("2026-10-12T10:00:01Z"), t("2026-10-12T10:00:00Z")));
});

test("la hora del teléfono mal puesta no manda: futuro o muy vieja → la del servidor", () => {
  const now = new Date("2026-10-12T20:00:00Z");
  assert.equal(clampAt(new Date("2026-10-12T19:00:00Z"), now).toISOString(), "2026-10-12T19:00:00.000Z");
  assert.equal(clampAt(new Date("2026-10-12T20:04:00Z"), now).toISOString(), "2026-10-12T20:04:00.000Z", "hasta 5 min de adelanto se tolera");
  assert.equal(clampAt(new Date("2030-01-01T00:00:00Z"), now), now);
  assert.equal(clampAt(new Date("2026-08-01T00:00:00Z"), now), now);
});

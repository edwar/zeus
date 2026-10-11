import test from "node:test";
import assert from "node:assert/strict";
import { QUOTE_STATUSES, TRANSITIONS, canMove, needsNote } from "../src/lib/quote-flow";

test("flujo: se avanza paso a paso y approved es final", () => {
  assert.ok(canMove("new", "contacted"));
  assert.ok(!canMove("new", "approved"), "no se salta la validación del cálculo");
  assert.ok(!canMove("contacted", "approved"));
  assert.ok(canMove("confirmed", "approved"));
  assert.deepEqual(TRANSITIONS.approved, []);
});

test("flujo: se puede descartar antes de aprobar y reabrir lo descartado", () => {
  for (const s of ["new", "contacted", "confirmed"] as const) assert.ok(canMove(s, "discarded"), s);
  assert.ok(!canMove("approved", "discarded"));
  assert.ok(canMove("discarded", "contacted"));
  assert.ok(!canMove("discarded", "approved"));
});

test("flujo: descartar exige motivo y todos los destinos son estados válidos", () => {
  assert.ok(needsNote("discarded"));
  assert.ok(!needsNote("contacted"));
  for (const to of Object.values(TRANSITIONS).flat()) assert.ok(QUOTE_STATUSES.includes(to));
});

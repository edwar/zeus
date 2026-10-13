import test from "node:test";
import assert from "node:assert/strict";
import { checkPortalSig, parsePortalRef, portalRef, portalSig } from "../src/lib/portal-link";
import { milestoneEnd, milestoneState, overallProgress } from "../src/lib/project-progress";

const secret = "s3cret";

test("portal: el enlace se reconstruye igual y lleva proyecto y firma de 43 caracteres", () => {
  const a = portalRef("q-2d9aj94p", 0, secret);
  assert.equal(a, portalRef("q-2d9aj94p", 0, secret));
  const p = parsePortalRef(a)!;
  assert.equal(p.id, "q-2d9aj94p");
  assert.match(p.sig, /^[A-Za-z0-9_-]{43}$/);
  assert.ok(checkPortalSig(p.id, p.sig, 0, secret));
});

test("portal: la firma depende del proyecto, de la versión y del secreto", () => {
  const sig = portalSig("q-1", 0, secret);
  assert.notEqual(sig, portalSig("q-2", 0, secret));
  assert.notEqual(sig, portalSig("q-1", 1, secret));
  assert.notEqual(sig, portalSig("q-1", 0, "otro"));
  assert.ok(!checkPortalSig("q-1", sig, 1, secret), "al subir la versión el enlace viejo deja de valer");
  assert.ok(!checkPortalSig("q-2", sig, 0, secret), "la firma de un proyecto no sirve para otro");
  assert.ok(!checkPortalSig("q-1", sig, 0, "otro"));
});

test("portal: referencias mal formadas se rechazan antes de consultar nada", () => {
  const ok = portalSig("q-1", 0, secret);
  for (const bad of ["", "q-1", ".", `.${ok}`, `q-1.${ok.slice(1)}`, `q-1.${ok}x`, `q 1.${ok}`, `q/1.${ok}`, `${"a".repeat(41)}.${ok}`, `q-1.${ok.slice(0, 42)}!`]) {
    assert.equal(parsePortalRef(bad), null, bad);
  }
  assert.ok(!checkPortalSig("q-1", "corta", 0, secret));
});

test("avance: hito hecho, en curso, atrasado y pendiente según la fecha", () => {
  const m = { startDate: "2026-10-10", len: 3, done: 0 }; // 10, 11 y 12
  assert.equal(milestoneEnd(m), "2026-10-12");
  assert.equal(milestoneState(m, "2026-10-09"), "todo");
  assert.equal(milestoneState(m, "2026-10-10"), "doing");
  assert.equal(milestoneState(m, "2026-10-12"), "doing");
  assert.equal(milestoneState(m, "2026-10-13"), "late");
  assert.equal(milestoneState({ ...m, done: 100 }, "2026-10-13"), "done");
  assert.equal(milestoneState({ ...m, done: 10 }, "2026-10-09"), "doing", "con avance ya está en curso");
});

test("avance: el general pondera por duración y no falla sin hitos", () => {
  assert.equal(overallProgress([]), 0);
  assert.equal(overallProgress([{ startDate: "2026-10-01", len: 1, done: 100 }, { startDate: "2026-10-02", len: 3, done: 0 }]), 25);
  assert.equal(overallProgress([{ startDate: "2026-10-01", len: 2, done: 50 }]), 50);
});

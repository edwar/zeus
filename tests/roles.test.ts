import test from "node:test";
import assert from "node:assert/strict";
import { ROLES, can, homeFor, normalizeRole, type Perm } from "../src/lib/roles";

const ALL: Perm[] = ["quotes", "cases", "catalog", "users", "teams.view", "teams.edit", "teams.delete", "projects.view", "projects.manage", "projects.progress"];

test("admin puede todo", () => {
  for (const p of ALL) assert.ok(can("admin", p), p);
});

test("gestión: solicitudes, proyectos y equipos; no usuarios, catálogo ni borrar equipos", () => {
  for (const p of ["quotes", "cases", "teams.view", "teams.edit", "projects.view", "projects.manage", "projects.progress"] as Perm[]) assert.ok(can("gestion", p), p);
  for (const p of ["users", "catalog", "teams.delete"] as Perm[]) assert.ok(!can("gestion", p), p);
});

test("equipo: solo ve proyectos y reporta avance; no ve solicitudes, casos, equipos, catálogo ni usuarios", () => {
  assert.deepEqual(ALL.filter((p) => can("equipo", p)), ["projects.view", "projects.progress"]);
});

test("un rol desconocido, vacío o el antiguo 'user' tiene los permisos del equipo (el menor)", () => {
  for (const r of ["user", "", "root", undefined, null]) {
    assert.equal(normalizeRole(r), "equipo");
    assert.ok(!can(r, "quotes"));
  }
  assert.deepEqual(ROLES, ["admin", "gestion", "equipo"]);
});

test("pantalla de inicio por rol", () => {
  assert.equal(homeFor("admin", "es"), "/es/app/quotes");
  assert.equal(homeFor("gestion", "en"), "/en/app/quotes");
  assert.equal(homeFor("equipo", "es"), "/es/app/projects");
  assert.equal(homeFor("user", "es"), "/es/app/projects");
});

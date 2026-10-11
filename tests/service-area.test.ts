import test from "node:test";
import assert from "node:assert/strict";
import { coverageFor, distanceKm, type TeamPoint } from "../src/lib/service-area";

const girardot = { lat: 4.3028, lon: -74.8036 };
const team = (id: string, p: Partial<TeamPoint> = {}): TeamPoint => ({ id, ...girardot, radiusKm: 100, maxActive: null, load: 0, ...p });

test("distancia: Girardot–Bogotá ≈ 90–100 km en línea recta; mismo punto = 0", () => {
  const d = distanceKm(girardot, { lat: 4.711, lon: -74.0721 });
  assert.ok(d > 85 && d < 105, String(d));
  assert.equal(distanceKm(girardot, girardot), 0);
});

test("sin equipos no hay cobertura: solo kit; sin ubicación queda por verificar", () => {
  assert.equal(coverageFor([], 4.46, -74.64).status, "kit_only");
  assert.equal(coverageFor([team("a")], null, null).status, "unknown");
  assert.equal(coverageFor([team("a")], NaN, 1).status, "unknown");
});

test("cerca de un equipo hay instalación; lejos de todos, solo kit", () => {
  const t = [team("gir")];
  const c = coverageFor(t, 4.46, -74.64); // Tocaima
  assert.deepEqual([c.status, c.teamId, c.covering], ["install", "gir", 1]);
  assert.equal(coverageFor(t, 10.39, -75.48).status, "kit_only"); // Cartagena
});

test("cada equipo cubre según su propio radio", () => {
  assert.equal(coverageFor([team("a", { radiusKm: 20 })], 4.711, -74.0721).status, "kit_only"); // Bogotá, ~93 km
  assert.equal(coverageFor([team("a", { radiusKm: 120 })], 4.711, -74.0721).status, "install");
});

test("varios equipos en la zona: se sugiere el más cercano con cupo", () => {
  const bogota = { lat: 4.711, lon: -74.0721 };
  const teams = [team("gir"), team("bog", { ...bogota }), team("bog2", { ...bogota, lat: 4.72 })];
  assert.equal(coverageFor(teams, 4.65, -74.1).teamId, "bog"); // el más cercano de los dos de Bogotá
  const full = [team("gir"), team("bog", { ...bogota, maxActive: 2, load: 2 }), team("bog2", { ...bogota, lat: 4.72, maxActive: 3, load: 1 })];
  assert.equal(coverageFor(full, 4.65, -74.1).teamId, "bog2"); // bog está lleno
});

test("si todos los equipos de la zona están llenos hay cobertura pero sin sugerencia", () => {
  const c = coverageFor([team("a", { maxActive: 1, load: 1 })], 4.46, -74.64);
  assert.deepEqual([c.status, c.teamId, c.covering], ["install", null, 1]);
});

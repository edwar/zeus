import { expect, test } from "@playwright/test";
import "dotenv/config";
import { cleanupRetention, retentionState, seedRetention } from "./support/db";

// Retención automática: el cron aplica los plazos de la política de privacidad. Corre contra la base de desarrollo:
// la limpieza es global (cualquier dato viejo de esa base también se limpia), por eso solo corre contra el entorno local.
test.describe.configure({ mode: "serial" });
test.beforeAll(() => seedRetention());
test.afterAll(() => cleanupRetention());

test("el cron exige su secreto", async ({ request }) => {
  expect((await request.get("/api/cron/retention")).status()).toBe(401);
  expect((await request.get("/api/cron/retention", { headers: { authorization: "Bearer incorrecto-incorrecto" } })).status()).toBe(401);
});

test("limpia lo que pasó de plazo y deja lo que sigue activo", async ({ request }) => {
  const secret = process.env.CRON_SECRET!;
  expect(secret?.length).toBeGreaterThanOrEqual(16);
  const before = retentionState();
  expect(Object.keys(before.quotes).sort()).toEqual(["aprobada", "evento-reciente", "recordatorio", "vieja"]);

  const res = await request.get("/api/cron/retention", { headers: { authorization: `Bearer ${secret}` } });
  expect(res.status()).toBe(200);
  const counts = (await res.json()) as { quotes: number; leads: number; simulations: number; accounts: number; sessions: number };
  expect(counts.quotes).toBeGreaterThanOrEqual(1);
  expect(counts.leads).toBeGreaterThanOrEqual(1);
  expect(counts.simulations).toBeGreaterThanOrEqual(1);
  expect(counts.accounts).toBeGreaterThanOrEqual(1);
  expect(counts.sessions).toBeGreaterThanOrEqual(1);

  const s = retentionState();
  // Solicitudes: solo la vieja, sin actividad y sin venta se anonimiza (y sus notas libres se borran).
  expect(s.quotes.vieja.anonymized).toBe(true);
  expect(s.quotes.vieja.eventNotes.every((n) => n === null)).toBe(true);
  expect(s.quotes["evento-reciente"].anonymized, "tuvo actividad hace 1 mes").toBe(false);
  expect(s.quotes.aprobada.anonymized, "una venta aprobada no se limpia sola").toBe(false);
  expect(s.quotes.recordatorio.anonymized, "tiene un recordatorio pendiente").toBe(false);
  // Contactos, cálculos y cuentas.
  expect(s.leads).toEqual(["lead-reciente"]);
  expect(s.simulations).toEqual(["sim-vigente"]);
  expect(s.users).toEqual(["user-reciente"]);
  expect(s.sessions).toBe(0);

  // Es idempotente: una segunda corrida no vuelve a tocar nada de lo sembrado.
  const again = (await (await request.get("/api/cron/retention", { headers: { authorization: `Bearer ${secret}` } })).json()) as typeof counts;
  expect(again.quotes + again.leads + again.accounts).toBe(0);
  expect(retentionState()).toEqual(s);
});

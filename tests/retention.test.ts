import { test } from "node:test";
import assert from "node:assert/strict";
import { monthsAgo, retentionCutoffs } from "../src/lib/retention";
import { LEGAL } from "../src/lib/legal/config";
import { privacy } from "../src/lib/legal/privacy";

test("los meses se restan como meses de calendario, no como 30 días", () => {
  assert.equal(monthsAgo(new Date("2026-10-15T12:00:00Z"), 24).toISOString(), "2024-10-15T12:00:00.000Z");
  assert.equal(monthsAgo(new Date("2026-03-15T00:00:00Z"), 12).toISOString(), "2025-03-15T00:00:00.000Z");
  assert.equal(monthsAgo(new Date("2026-01-10T00:00:00Z"), 2).toISOString(), "2025-11-10T00:00:00.000Z");
});

test("los plazos de la limpieza salen de la política publicada", () => {
  const now = new Date("2026-10-15T00:00:00Z");
  const c = retentionCutoffs(now);
  assert.equal(c.quotes.toISOString(), "2024-10-15T00:00:00.000Z");
  assert.equal(c.accounts.toISOString(), "2025-10-15T00:00:00.000Z");
  assert.equal(c.simulations.getTime(), now.getTime());
  assert.ok(c.sessions < now && c.technical < now);
});

test("el texto de la política y los números que aplica la limpieza dicen lo mismo", () => {
  const p = LEGAL.retentionPolicy;
  assert.match(LEGAL.retention.quotes.es, new RegExp(`${p.quotesMonths} meses`));
  assert.match(LEGAL.retention.quotes.en, new RegExp(`${p.quotesMonths} months`));
  assert.match(LEGAL.retention.accounts.es, new RegExp(`${p.accountsMonths} meses`));
  assert.match(LEGAL.retention.accounts.en, new RegExp(`${p.accountsMonths} months`));
  const text = JSON.stringify(privacy);
  assert.match(text, new RegExp(`a los ${p.simulationDays} días`));
  assert.match(text, new RegExp(`after ${p.simulationDays} days`));
});

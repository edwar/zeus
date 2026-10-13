import { expect, test, type Page } from "@playwright/test";
import { cleanupField, seedField } from "./support/db";
import { PASSWORD, USERS } from "./support/env";

// Modo campo SIN señal de verdad: recargar la página y volver a abrirla con el navegador desconectado. Necesita el service worker,
// que solo existe en la versión de producción (por eso estas pruebas corren contra otro servidor: ver playwright.config.ts).
test.describe.configure({ mode: "serial" });

let mine = "";

const PROJECT = "E2E Sistema de campo off";
const cacheEntries = (page: Page) =>
  page.evaluate(async () => {
    const out: string[] = [];
    for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) out.push(`${k} ${new URL(r.url).pathname}`);
    return out;
  });
const serverChecks = async (page: Page) => {
  const r = (await (await page.request.get("/api/field/projects")).json()) as { projects: { id: string; checks: { key: string; done: boolean }[] }[] };
  return r.projects.find((p) => p.id === mine)!.checks;
};

test.beforeAll(() => { ({ mine } = seedField("off")); });
test.afterAll(() => cleanupField());

test("la app abre sin señal, guarda lo que se hace, lo conserva al recargar y lo envía al volver; al cerrar sesión no queda nada en el teléfono", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, locale: "es-CO", viewport: { width: 1280, height: 900 } });
  // La versión de producción usa cookies seguras propias: se inicia sesión en ella (la sesión de las otras pruebas no sirve aquí).
  const login = await ctx.request.post("/api/auth/sign-in/email", { data: { email: USERS.equipo.email, password: PASSWORD }, headers: { origin: baseURL! } });
  expect(login.ok(), `login ${login.status()}`).toBe(true);
  const page = await ctx.newPage();

  // 1 · Con señal: abre, se registra el service worker y se baja una copia de los proyectos.
  await page.goto("/es/app/field");
  await expect(page.getByRole("heading", { level: 1, name: "Modo campo" })).toBeVisible();
  await expect(page.locator(".field__card", { hasText: PROJECT })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  // Con el service worker ya al mando, una segunda visita deja guardada la página y los archivos de la app.
  await page.reload();
  await expect(page.locator(".field__card", { hasText: PROJECT })).toBeVisible();
  await expect.poll(async () => (await cacheEntries(page)).some((e) => /zeus-pages-\S+ \/es\/app\/field$/.test(e)), { timeout: 30_000 }).toBe(true);

  // Lo guardado son solo archivos de la aplicación y la página del modo campo: nunca datos de clientes (eso va en IndexedDB).
  const entries = await cacheEntries(page);
  expect(entries.length).toBeGreaterThan(3);
  for (const e of entries) {
    expect(e, e).not.toContain("/api/");
    expect(e, e).toMatch(/\/_next\/static\/|\/icon-|\/apple-icon|\/favicon|\/(es|en)\/app\/field$/);
  }

  // 2 · Sin señal: la página recarga igual y trabaja con lo que hay en el teléfono.
  await ctx.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Modo campo" })).toBeVisible();
  await expect(page.locator(".field__status")).toContainText("Sin conexión");
  await page.locator(".field__card", { hasText: PROJECT }).getByRole("button", { name: "Abrir" }).click();
  await page.locator(".field__check", { hasText: "Estructura de soporte" }).getByRole("checkbox").check();
  await page.locator(".field__check", { hasText: "Paneles montados" }).getByRole("checkbox").check();
  await expect(page.locator(".field__status")).toContainText("2 sin enviar");

  // Cerrar y volver a abrir la app sin señal: lo hecho sigue ahí (no se pierde al recargar).
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Modo campo" })).toBeVisible();
  await expect(page.locator(".field__status")).toContainText("2 sin enviar");
  await expect(page).toHaveURL(/\?p=/);
  await expect(page.locator(".field__check", { hasText: "Estructura de soporte" })).toHaveClass(/is-done/);
  await expect(page.locator(".field__check", { hasText: "Paneles montados" })).toHaveClass(/is-done/);

  // 3 · Vuelve la señal: se envía solo.
  await ctx.setOffline(false);
  await expect(page.locator(".field__status")).toContainText("Todo enviado", { timeout: 30_000 });
  const checks = await serverChecks(page);
  expect(checks.find((c) => c.key === "structure")!.done).toBe(true);
  expect(checks.find((c) => c.key === "panels")!.done).toBe(true);
  expect(checks.find((c) => c.key === "site")!.done).toBe(false);

  // 4 · Cerrar sesión borra la copia, la cola y los cachés de este teléfono.
  await page.locator(".app__side").getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForURL(/\/es$/);
  expect((await cacheEntries(page)).filter((e) => e.startsWith("zeus-"))).toEqual([]);
  const leftovers = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open("zeus-field");
        req.onsuccess = () => {
          const db = req.result;
          const names = [...db.objectStoreNames];
          if (names.length === 0) return resolve(0);
          const tx = db.transaction(names, "readonly");
          let n = 0;
          let left = names.length;
          for (const s of names) {
            const c = tx.objectStore(s).count();
            c.onsuccess = () => { n += c.result; if (--left === 0) resolve(n); };
          }
        };
        req.onerror = () => resolve(-1);
      }),
  );
  expect(leftovers).toBe(0);
  await ctx.close();
});

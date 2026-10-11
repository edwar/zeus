import { expect, test, type Page } from "@playwright/test";
import { CLIENTS, TEAM_NAME } from "./support/env";
import { as } from "./support/session";
import { buildKit, sendQuote } from "./support/simulator";

// Flujo de negocio de punta a punta. Cada prueba depende de la anterior (equipo → solicitud → proyecto), por eso en serie.
test.describe.configure({ mode: "serial" });

const status = (page: Page) => page.locator(".panel__meta").first();

async function openQuote(page: Page, client: string) {
  await page.goto("/es/app/quotes");
  await page.getByRole("link", { name: client }).click();
  await page.waitForURL("**/quotes/*");
  await expect(page.getByText(client).first()).toBeVisible();
}

/** Abre el único proyecto de la corrida (la tarjeta se enlaza por su título, "Sistema … kWp · ciudad"). La primera visita compila la ruta en `next dev`, de ahí el plazo largo. */
async function openProject(page: Page) {
  await page.goto("/es/app/projects");
  // El clic antes de hidratar no navega: se reintenta hasta que carguen las pestañas.
  await expect(async () => {
    if (!/\/projects\/[^/]+$/.test(page.url())) await page.getByRole("link", { name: /^Sistema .* kWp/ }).first().click({ timeout: 5_000 });
    await expect(page.getByRole("tab", { name: "Cronograma" })).toBeVisible({ timeout: 10_000 });
  }).toPass({ timeout: 120_000 });
}

async function advance(page: Page, steps: { button: RegExp; badge: string }[]) {
  for (const s of steps) {
    await page.locator(".flow__actions button").filter({ hasText: s.button }).first().click();
    await expect(status(page)).toContainText(s.badge);
  }
}

test.describe("solicitud → proyecto", () => {
  test("sin equipos en la zona, la solicitud es solo kit y no crea proyecto", async ({ browser, page }) => {
    await buildKit(page);
    const done = await sendQuote(page, CLIENTS.kitOnly);
    await expect(done).toContainText(/solo por el kit/i);

    const admin = await as(browser, "admin");
    await openQuote(admin, CLIENTS.kitOnly.name);
    await advance(admin, [
      { button: /contactada/i, badge: "Contactada" },
      { button: /confirm/i, badge: "Cálculo confirmado" },
      { button: /aprobar/i, badge: "Aprobada" },
    ]);
    await admin.goto("/es/app/projects");
    await expect(admin.getByText("Aún no hay proyectos")).toBeVisible();
    await admin.close();
  });

  test("admin crea un equipo con base en Bucaramanga e integra al instalador", async ({ browser }) => {
    const admin = await as(browser, "admin");
    await admin.goto("/es/app/teams/new");
    await admin.locator("input[name=name]").fill(TEAM_NAME);
    await admin.locator("input[name=contactName]").fill("Contacto E2E");
    await admin.locator("input[type=tel], input[name=phone]").first().fill("3001112233");
    await admin.getByPlaceholder(/Bucaramanga/).fill("Bucaramanga, Santander");
    await admin.getByRole("button", { name: "Buscar" }).click();
    await admin.locator(".loc__results button").first().click();
    await admin.locator("input[name=radiusKm]").fill("100");
    await admin.locator("li label").filter({ hasText: "e2e-equipo@example.com" }).locator("input").check();
    await admin.getByRole("button", { name: /^guardar/i }).click();
    await expect(admin).not.toHaveURL(/\/teams\/new$/);
    await admin.goto("/es/app/teams");
    await expect(admin.getByText(TEAM_NAME)).toBeVisible();
    await admin.close();
  });

  test("con un equipo cercano el simulador ofrece instalación y la solicitud la incluye", async ({ page }) => {
    await buildKit(page);
    await expect(page.locator("input[name=installer]").first()).toBeVisible();
    const done = await sendQuote(page, CLIENTS.install, "zeus");
    await expect(done).toContainText(/Referencia/i);
    await expect(done).not.toContainText(/solo por el kit/i);
  });

  test("al aprobar la solicitud con instalación se crea el proyecto", async ({ browser }) => {
    const admin = await as(browser, "admin");
    await openQuote(admin, CLIENTS.install.name);
    await advance(admin, [
      { button: /contactada/i, badge: "Contactada" },
      { button: /confirm/i, badge: "Cálculo confirmado" },
      { button: /aprobar/i, badge: "Aprobada" },
    ]);
    await admin.goto("/es/app/projects");
    await expect(admin.locator("main")).toContainText(CLIENTS.install.name);
    await admin.close();
  });

  test("admin gestiona el proyecto: cronograma, avance, materiales, monitoreo y alertas", async ({ browser }) => {
    const admin = await as(browser, "admin");
    await openProject(admin);

    await admin.getByRole("tab", { name: "Cronograma" }).click();
    await admin.getByRole("button", { name: "Generar cronograma" }).click();
    await expect(admin.locator("table tbody tr").first()).toBeVisible();

    const progress = admin.locator('input[aria-label^="Avance"]').first();
    await progress.fill("100");
    await progress.press("Enter");
    await expect(async () => {
      await admin.reload();
      await admin.getByRole("tab", { name: "Cronograma" }).click();
      await expect(admin.locator('input[aria-label^="Avance"]').first()).toHaveValue("100", { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });

    await admin.getByRole("tab", { name: "Materiales" }).click();
    await admin.getByRole("button", { name: "Marcar todos" }).click();
    await expect(admin.locator(".check__item input:not(:checked)")).toHaveCount(0);

    await admin.getByRole("tab", { name: "Monitoreo" }).click();
    await admin.getByLabel("Enlace a la app").fill("https://example.com/monitor");
    await admin.getByRole("button", { name: "Guardar enlace" }).click();
    await expect(admin.getByRole("link", { name: /Abrir app/i })).toBeVisible();

    await admin.getByLabel("¿Qué pasó?").fill("Alerta E2E: el inversor no genera");
    await admin.getByRole("button", { name: "Registrar alerta" }).click();
    await expect(admin.getByText("Alerta E2E: el inversor no genera")).toBeVisible();
    await admin.close();
  });
});

test.describe("roles", () => {
  test("Equipo: solo ve Proyectos y el de su equipo, sin controles de gestión", async ({ browser }) => {
    const e = await as(browser, "equipo");
    await e.goto("/es/app");
    await expect(e).toHaveURL(/\/app\/projects/);
    await expect(e.locator("nav.app__nav")).not.toContainText(/Solicitudes|Usuarios|Productos|Equipos/);

    for (const path of ["quotes", "users", "products", "teams", "manufacturers"]) {
      await e.goto(`/es/app/${path}`);
      await expect(e, path).toHaveURL(/\/app\/projects/);
    }

    await openProject(e);
    await expect(e.getByRole("button", { name: "Agregar hito" })).toHaveCount(0);
    await e.getByRole("tab", { name: "Monitoreo" }).click();
    await expect(e.getByRole("button", { name: "Cambiar enlace" })).toHaveCount(0);

    // Los permisos se aplican también en el servidor, no solo en la interfaz.
    expect((await e.request.get("/api/quotes")).status()).toBe(403);
    expect((await e.request.get("/api/teams")).status()).toBe(403);
    expect((await e.request.get("/api/projects")).status()).toBe(200);
    await e.close();
  });

  test("Gestión: solicitudes, proyectos y equipos sí; usuarios y catálogo no", async ({ browser }) => {
    const g = await as(browser, "gestion");
    for (const path of ["quotes", "projects", "teams"]) {
      await g.goto(`/es/app/${path}`);
      await expect(g, path).toHaveURL(new RegExp(`/app/${path}`));
    }
    for (const path of ["users", "products", "manufacturers"]) {
      await g.goto(`/es/app/${path}`);
      await expect(g, path).toHaveURL(/\/app\/quotes/);
    }
    await g.close();
  });
});

import { expect, test } from "@playwright/test";
import { as } from "./support/session";

// Página 404 propia: cada zona la muestra en su contexto y en el idioma de la URL.
test("URL sin ruta: 404 con la identidad de Zeus, en el idioma de la URL", async ({ page }) => {
  const res = await page.goto("/es/esto-no-existe");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Esta página se fue a tomar el sol" })).toBeVisible();
  await expect(page.getByText("Error 404")).toBeVisible();
  await page.screenshot({ path: "/private/tmp/claude-502/-Users-edwar-dev-personal-zeus/4634b759-e5bc-42eb-8bb7-c86a30d84565/scratchpad/nf-es.png" });
  await page.getByRole("link", { name: "Ir al inicio" }).click();
  await expect(page).toHaveURL(/\/es$/);

  await page.goto("/en/this-does-not-exist");
  await expect(page.getByRole("heading", { name: "This page went out to catch some sun" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Calculate my savings" })).toHaveAttribute("href", "/en/simulator");
});

test("página pública con notFound() (producto inexistente) se ve dentro de la cabecera del sitio", async ({ page }) => {
  await page.goto("/es/products/no-existe-este-producto");
  await expect(page.getByRole("heading", { name: "Esta página se fue a tomar el sol" })).toBeVisible();
  await expect(page.locator("header.sitehead")).toBeVisible();
  await expect(page.getByText(/could not be found/i)).toHaveCount(0);
  await page.screenshot({ path: "/private/tmp/claude-502/-Users-edwar-dev-personal-zeus/4634b759-e5bc-42eb-8bb7-c86a30d84565/scratchpad/nf-site.png" });
});

test("enlace de cotización inventado muestra el 404 propio", async ({ page }) => {
  await page.goto(`/es/q/${"B".repeat(43)}`);
  await expect(page.getByRole("heading", { name: "Esta página se fue a tomar el sol" })).toBeVisible();
});

test("dentro de la plataforma el 404 conserva el menú lateral (y sin sesión se va al acceso)", async ({ browser }) => {
  const admin = await as(browser, "admin");
  await admin.goto("/es/app/ruta-que-no-existe");
  await expect(admin.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
  await expect(admin.locator("nav.app__nav")).toBeVisible();
  await admin.screenshot({ path: "/private/tmp/claude-502/-Users-edwar-dev-personal-zeus/4634b759-e5bc-42eb-8bb7-c86a30d84565/scratchpad/nf-app.png" });
  await admin.getByRole("link", { name: "Ir al panel" }).click();
  await expect(admin).toHaveURL(/\/app\/quotes/);
  await admin.close();
});

test("sin sesión, una URL desconocida de la plataforma lleva al acceso", async ({ page }) => {
  await page.goto("/es/app/ruta-que-no-existe");
  await expect(page).toHaveURL(/\/es\/login/);
});

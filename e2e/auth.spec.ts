import { expect, test } from "@playwright/test";
import { PASSWORD, USERS } from "./support/env";

test.describe("inicio de sesión", () => {
  test("clave incorrecta muestra el error y no entra", async ({ page }) => {
    await page.goto("/es/login");
    await page.getByLabel(/Correo/i).first().fill(USERS.admin.email);
    await page.locator("input[type=password]").fill("clave-incorrecta-123");
    await page.getByRole("button", { name: /ingresar/i }).last().click();
    await expect(page.getByRole("alert").filter({ hasText: /incorrectos/i })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin entra y aterriza en solicitudes", async ({ page }) => {
    await page.goto("/es/login");
    await page.getByLabel(/Correo/i).first().fill(USERS.admin.email);
    await page.locator("input[type=password]").fill(PASSWORD);
    await page.getByRole("button", { name: /ingresar/i }).last().click();
    await expect(page).toHaveURL(/\/app\/quotes/);
  });

  test("las 6 secciones del admin cargan", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: "e2e/.auth/admin.json" });
    const page = await ctx.newPage();
    for (const path of ["quotes", "projects", "teams", "products", "manufacturers", "users"]) {
      const res = await page.goto(`/es/app/${path}`);
      expect(res?.status(), path).toBe(200);
      expect(page.url(), path).toContain(`/app/${path}`);
    }
    await ctx.close();
  });
});

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

  test("la contraseña se puede mostrar y ocultar", async ({ page }) => {
    await page.goto("/es/login");
    const input = page.locator("input[name=password]");
    await input.fill("mi-clave-secreta");
    await expect(input).toHaveAttribute("type", "password");

    const show = page.getByRole("button", { name: "Mostrar contraseña" });
    await expect(show).toHaveAttribute("aria-pressed", "false");
    await show.click();
    await expect(input).toHaveAttribute("type", "text");
    await expect(input).toHaveValue("mi-clave-secreta");
    const hide = page.getByRole("button", { name: "Ocultar contraseña" });
    await expect(hide).toHaveAttribute("aria-pressed", "true");

    await hide.click();
    await expect(input).toHaveAttribute("type", "password");
    await expect(page.getByRole("button", { name: "Mostrar contraseña" })).toBeVisible();
    // Mostrar la contraseña no envía el formulario ni borra lo escrito.
    await expect(page).toHaveURL(/\/login/);
    await expect(input).toHaveValue("mi-clave-secreta");
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

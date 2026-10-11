import { expect, test } from "@playwright/test";
import { manualEntry } from "./support/simulator";

test.describe("sitio público", () => {
  for (const path of ["/es", "/en", "/es/products", "/es/simulator", "/es/login"]) {
    test(`GET ${path} responde 200`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
    });
  }

  test("catálogo lista productos y abre el detalle", async ({ page }) => {
    await page.goto("/es/products");
    const links = page.locator('a[href*="/products/"]');
    await expect(links.first()).toBeVisible();
    const href = await links.first().getAttribute("href");
    const res = await page.goto(href!);
    expect(res?.status()).toBe(200);
  });

  test("simulador: avanzar sin datos muestra errores de validación", async ({ page }) => {
    await page.goto("/es/simulator");
    await manualEntry(page);
    await page.getByRole("button", { name: /calcular mi kit/i }).click();
    await expect(page.locator("[aria-invalid=true]").first()).toBeVisible();
  });

  test("/app sin sesión redirige al login", async ({ page }) => {
    await page.goto("/es/app");
    await expect(page).toHaveURL(/\/login/);
  });

  test("la API privada exige sesión", async ({ request }) => {
    for (const path of ["quotes", "teams", "products"]) {
      expect((await request.get(`/api/${path}`)).status(), path).toBe(401);
    }
  });
});

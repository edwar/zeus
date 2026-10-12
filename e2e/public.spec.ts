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

test.describe("escena del hero", () => {
  test("cada tipo de lugar tiene su propio edificio", async ({ page }) => {
    await page.goto("/es");
    const scene = page.locator(".sd__svg");
    await expect(scene.locator("[data-building]")).toHaveAttribute("data-building", "home");
    for (const [label, building] of [["Oficina", "office"], ["Local comercial", "shop"], ["Taller", "workshop"], ["Casa", "home"]] as const) {
      await page.getByRole("radio", { name: label }).click();
      await expect(scene.locator("[data-building]")).toHaveCount(1);
      await expect(scene.locator("[data-building]")).toHaveAttribute("data-building", building);
    }
  });

  // Con «reducir movimiento» una transición CSS de 0.01ms congelaba el sol y los puntos del gráfico (cx/cy son propiedades
  // CSS): el atributo cambiaba pero el valor pintado se quedaba en el inicial.
  test("con movimiento reducido el sol y los puntos siguen a la hora", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto("/es");
    await page.locator(".sd__play").click();
    await page.waitForTimeout(1200);
    const m = await page.evaluate(() => {
      const circles = [...document.querySelectorAll(".sd__svg circle")];
      const sun = circles.find((c) => c.getAttribute("r") === "26")!;
      const dot = circles.find((c) => c.getAttribute("r") === "8")!;
      const px = (v: string) => parseFloat(v);
      return {
        sun: [Number(sun.getAttribute("cx")), px(getComputedStyle(sun).cx)],
        dot: [Number(dot.getAttribute("cx")), px(getComputedStyle(dot).cx)],
      };
    });
    expect(m.sun[1]).toBeCloseTo(m.sun[0], 0);
    expect(m.dot[1]).toBeCloseTo(m.dot[0], 0);
    await ctx.close();
  });
});

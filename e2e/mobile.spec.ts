import { expect, test } from "@playwright/test";
import { as } from "./support/session";

// En móvil, un esqueleto de carga más ancho que la pantalla ensanchaba la página: el navegador agrandaba la ventana
// de diseño y la barra inferior (fija) quedaba fuera de la zona visible mientras cargaban los datos.
test.describe("panel en móvil", () => {
  test("durante la carga la página no se ensancha y la barra inferior sigue a la vista", async ({ browser }) => {
    const page = await as(browser, "admin", { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
    await page.goto("/es/app/projects");
    await expect(page.locator(".app__tabs")).toBeVisible();
    await expect(page.locator(".loading")).toHaveCount(0); // que termine la carga inicial antes de navegar

    // Retrasa los datos para que el esqueleto se quede el tiempo suficiente en pantalla.
    await page.route("**/api/**", async (route) => {
      if (route.request().method() === "GET") await new Promise((r) => setTimeout(r, 4000));
      await route.continue();
    });
    await page.locator(".app__tab").nth(5).click(); // Usuarios: su esqueleto es una tabla ancha
    await expect(page.locator(".loading")).toBeVisible();

    // El tamaño real de la pantalla: `innerWidth` crece junto con la página cuando esta se ensancha.
    const screen = page.viewportSize()!;
    const m = await page.evaluate(() => {
      const bar = document.querySelector(".app__tabs")!.getBoundingClientRect();
      return { docW: document.documentElement.scrollWidth, top: bar.top, bottom: bar.bottom, left: bar.left, right: bar.right };
    });
    expect(m.docW).toBeLessThanOrEqual(screen.width);
    expect(m.bottom).toBeLessThanOrEqual(screen.height);
    expect(m.top).toBeGreaterThanOrEqual(0);
    expect(m.right).toBeLessThanOrEqual(screen.width);
    await page.close();
  });

  test("la barra inferior cabe sin desplazarse con las seis secciones", async ({ browser }) => {
    const page = await as(browser, "admin", { viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true });
    await page.goto("/es/app/quotes");
    const bar = page.locator(".app__tabs");
    await expect(bar).toBeVisible();
    await expect(bar.locator(".app__tab")).toHaveCount(6);
    expect(await bar.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    // Solo la sección activa muestra su nombre; las demás son iconos de 44 px como mínimo.
    const widths = await bar.locator(".app__tab").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(44);
    await page.close();
  });
});

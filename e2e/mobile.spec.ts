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
    // Usuarios (está en «Más»): su esqueleto es una tabla ancha.
    await page.getByRole("button", { name: "Más" }).click();
    await page.getByRole("menuitem", { name: "Usuarios" }).click();
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

  test("la barra inferior deja a la vista lo principal y el último icono («Más») despliega el resto", async ({ browser }) => {
    // Administración: 10 secciones → 4 a la vista + «Más».
    const page = await as(browser, "admin", { viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true });
    await page.goto("/es/app/quotes");
    const bar = page.locator(".app__tabs");
    await expect(bar).toBeVisible();
    await expect(bar.locator(".app__tab")).toHaveCount(5);
    expect(await bar.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    const widths = await bar.locator(".app__tab").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(44); // objetivo táctil completo, ya sin apretar
    // La sección activa muestra su nombre completo (sin recortar), al lado del icono.
    const label = bar.locator('.app__tab[aria-current="page"] span');
    await expect(label).toHaveText("Solicitudes");
    expect(await label.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    const layout = await bar.locator('.app__tab[aria-current="page"]').evaluate((el) => {
      const i = el.querySelector("svg")!.getBoundingClientRect();
      const l = el.querySelector("span")!.getBoundingClientRect();
      return { sameRow: Math.abs((i.top + i.bottom) / 2 - (l.top + l.bottom) / 2) < 6, labelAfterIcon: l.left >= i.right - 1 };
    });
    expect(layout).toEqual({ sameRow: true, labelAfterIcon: true }); // icono y texto en la misma fila
    await expect(bar.getByRole("link")).toHaveCount(4);

    // Lo más importante (solicitudes, proyectos, seguimiento, equipos) a la vista; lo demás, en «Más».
    for (const name of ["Solicitudes", "Proyectos", "Seguimiento", "Equipos"]) await expect(bar.getByRole("link", { name })).toBeVisible();
    await bar.getByRole("button", { name: "Más" }).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveText(["Casos", "Inventario", "Productos", "Fabricantes", "Usuarios"]);
    await menu.getByRole("menuitem", { name: "Casos" }).click();
    await expect(page).toHaveURL(/\/app\/cases/);
    // Estando en una sección del menú, «Más» aparece seleccionado con el nombre de esa sección.
    await expect(bar.getByRole("button", { name: "Más" })).toHaveAttribute("aria-current", "page");
    await expect(bar.getByRole("button", { name: "Más" })).toContainText("Casos");
    await page.close();

    // Gestión: 6 secciones → 4 a la vista + «Más» (casos e inventario).
    const g = await as(browser, "gestion", { viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true });
    await g.goto("/es/app/quotes");
    await expect(g.locator(".app__tabs .app__tab")).toHaveCount(5);
    await g.locator(".app__tabs").getByRole("button", { name: "Más" }).click();
    await expect(g.getByRole("menu").getByRole("menuitem")).toHaveText(["Casos", "Inventario"]);
    await g.close();
  });
});

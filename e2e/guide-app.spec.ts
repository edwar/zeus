import { expect, test } from "@playwright/test";
import { as } from "./support/session";

// Guía del equipo dentro de la plataforma + la nueva distribución de los iconos del menú.
test("el icono de la guía abre la guía del equipo con todas sus secciones", async ({ browser }) => {
  const admin = await as(browser, "admin");
  await admin.goto("/es/app/quotes");
  await admin.locator(".app__side").getByRole("link", { name: "Guía del equipo" }).click();
  await expect(admin).toHaveURL(/\/es\/app\/guide$/);
  await expect(admin.getByRole("heading", { level: 1, name: "Guía del equipo" })).toBeVisible();
  const toc = admin.getByRole("navigation", { name: "Secciones de la guía" });
  await expect(toc.getByRole("link")).toHaveCount(12); // inicio + 11 secciones (la plantilla no se muestra)
  await expect(toc).not.toContainText("Plantilla");

  await toc.getByRole("link", { name: /Solicitudes y cotización/ }).click();
  await expect(admin).toHaveURL(/\/guide\/02-solicitudes-y-cotizacion$/);
  await expect(toc.getByRole("link", { name: /Solicitudes y cotización/ })).toHaveAttribute("aria-current", "page");
  await expect(admin.locator(".guidedoc__body:visible table").first()).toBeVisible(); // las tablas del Markdown se ven como tablas
  await expect(admin.locator(".guidedoc__body:visible")).toContainText("Cálculo confirmado");

  // Los enlaces entre secciones funcionan; los que apuntan a archivos del repositorio quedan como texto.
  await admin.locator(".guidedoc__body:visible a", { hasText: "sección 8" }).first().click();
  await expect(admin).toHaveURL(/\/guide\/08-seguimiento$/);
  await expect(admin.locator(".guidedoc__body:visible a[href*='PRODUCT.md']")).toHaveCount(0);
  await admin.getByRole("link", { name: /Siguiente|Anterior/ }).first().click();
  await expect(admin).toHaveURL(/\/es\/app\/guide(\/|$)/);
  await admin.screenshot({ path: process.env.GUIDE_SHOT ?? "test-results/guide-app.png", fullPage: false });
  await admin.close();
});

test("la guía no deja leer archivos que no son de la lista y exige sesión", async ({ browser, page }) => {
  const admin = await as(browser, "admin");
  for (const bad of ["PLANTILLA", "..%2F..%2F.env", "99-no-existe", "readme"]) {
    await admin.goto(`/es/app/guide/${bad}`);
    await expect(admin.getByRole("heading", { name: "Esta página se fue a tomar el sol" }).or(admin.getByRole("heading", { name: "No encontramos esta página" })), bad).toBeVisible();
    await expect(admin.locator("body"), bad).not.toContainText("BETTER_AUTH_SECRET");
  }
  await admin.close();
  await page.goto("/es/app/guide");
  await expect(page).toHaveURL(/\/es\/login/);
});

test("el rol equipo también ve la guía (es para todo el personal)", async ({ browser }) => {
  const e = await as(browser, "equipo");
  await e.goto("/es/app/guide");
  await expect(e.getByRole("heading", { level: 1, name: "Guía del equipo" })).toBeVisible();
  await e.close();
});

test("escritorio: tres filas en el pie (sitio e idioma · avatar y nombre · tres iconos, con cerrar sesión al final)", async ({ browser }) => {
  const admin = await as(browser, "admin");
  await admin.goto("/es/app/quotes");
  const foot = admin.locator(".app__side-foot");
  const rows = await foot.locator("> div").evaluateAll((els) => els.map((e) => ({ cls: e.className, top: Math.round(e.getBoundingClientRect().top) })));
  expect(rows.map((r) => r.cls)).toEqual(["app__foot-row", "app__account", "app__tools"]);
  expect(rows[0].top).toBeLessThan(rows[1].top);
  expect(rows[1].top).toBeLessThan(rows[2].top);
  // Fila 1: sitio público + idioma. Fila 3 (la última de la barra): guía, contraseña, cerrar sesión (solo iconos, con nombre accesible).
  await expect(foot.locator(".app__foot-row")).toContainText("Sitio público");
  await expect(foot.locator(".app__foot-row .locale")).toBeVisible();
  const tools = foot.locator(".app__tools .app__icon");
  await expect(tools).toHaveCount(3);
  await expect(tools.nth(0)).toHaveAccessibleName("Guía del equipo");
  await expect(tools.nth(1)).toHaveAccessibleName("Cambiar contraseña");
  await expect(tools.nth(2)).toHaveAccessibleName("Cerrar sesión");
  expect(await tools.evaluateAll((els) => els.every((e) => !e.textContent?.trim()))).toBe(true);
  // Fila 2: la inicial y el nombre.
  await expect(foot.locator(".app__avatar")).toHaveText("E");
  await expect(foot.locator(".app__user")).toHaveText("E2E Admin");
  await admin.close();
});

test("móvil: la barra superior lleva un menú de cuenta y la inferior muestra el nombre solo en la sección activa, al lado del icono", async ({ browser }) => {
  const page = await as(browser, "admin", { viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true });
  await page.goto("/es/app/quotes");
  const top = page.locator(".app__top");
  // Un solo botón de cuenta (la inicial) en vez de tres iconos sueltos; el menú se abre con iconos y nombres.
  await expect(top.locator(".app__icon")).toHaveCount(0);
  const me = top.getByRole("button", { name: "Mi cuenta" });
  await expect(me).toHaveText("E");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await me.click();
  const menu = page.getByRole("menu");
  await expect(menu).toContainText("E2E Admin");
  const items = menu.getByRole("menuitem");
  await expect(items).toHaveText(["Guía del equipo", "Cambiar contraseña", "Cerrar sesión"]);
  for (let i = 0; i < 3; i++) await expect(items.nth(i).locator("svg")).toBeVisible(); // cada opción lleva su icono
  expect((await items.first().boundingBox())!.height).toBeGreaterThanOrEqual(44); // objetivo táctil mínimo
  await page.screenshot({ path: process.env.GUIDE_SHOT_MENU ?? "test-results/menu-open.png" });
  await items.first().click();
  await expect(page).toHaveURL(/\/es\/app\/guide$/);
  await page.goto("/es/app/quotes"); // de vuelta a una sección con pestaña, para revisar la barra inferior

  const tabs = page.locator(".app__tabs .app__tab");
  const active = page.locator('.app__tabs .app__tab[aria-current="page"]');
  await expect(active).toHaveCount(1);
  // La activa: icono y texto en la misma fila (el texto después del icono), ambos visibles.
  const parts = await active.evaluate((el) => {
    const svg = el.querySelector("svg")!.getBoundingClientRect();
    const label = el.querySelector("span")!.getBoundingClientRect();
    return { iconRight: svg.right, labelLeft: label.left, labelH: label.height, sameRow: Math.abs((svg.top + svg.bottom) / 2 - (label.top + label.bottom) / 2) < 6 };
  });
  expect(parts.labelH).toBeGreaterThan(5);
  expect(parts.labelLeft).toBeGreaterThanOrEqual(parts.iconRight - 1);
  expect(parts.sameRow).toBe(true);
  // Las demás: solo el icono (el nombre sigue en el DOM para lectores de pantalla pero no se ve).
  const others = await tabs.evaluateAll((els) => els.filter((e) => e.getAttribute("aria-current") !== "page").map((e) => Math.round(e.querySelector("span")!.getBoundingClientRect().width)));
  expect(others.every((w) => w <= 1)).toBe(true);
  // La barra sigue cabiendo en la pantalla.
  expect(await page.locator(".app__tabs").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: process.env.GUIDE_SHOT_MOBILE ?? "test-results/menu-mobile.png" });
  await page.close();
});

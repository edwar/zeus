import { expect, test, type Page } from "@playwright/test";
import { buildKit } from "./support/simulator";

// Comparador de escenarios (paso del kit): tamaños distintos, al contado y financiado, con los mismos números que el resto de la pantalla.
const cards = (page: Page) => page.locator(".cmp__card");
const card = (page: Page, pct: number) => page.locator(".cmp__card", { has: page.getByRole("heading", { name: `Cubrir el ${pct} %` }) });
const row = (c: ReturnType<typeof card>, label: RegExp) => c.locator("dl > div", { has: c.page().locator("dt", { hasText: label }) }).locator("dd").first();
const digits = (s: string) => Number(s.replace(/[^\d]/g, ""));
const decimal = (s: string) => Number(s.replace(/[^\d,.]/g, "").replace(",", "."));

test("el comparador se abre a pedido y muestra tres tamaños con el actual marcado", async ({ page }) => {
  const kitRequests: string[] = [];
  page.on("request", (r) => r.url().endsWith("/api/simulator/kit") && r.method() === "POST" && kitRequests.push(r.postData() ?? ""));
  await buildKit(page);
  const section = page.locator(".cmp");
  await expect(section.getByRole("heading", { name: "Compara escenarios" })).toBeVisible();
  await expect(cards(page)).toHaveCount(0); // cerrado: no se calcula nada de más
  const before = kitRequests.length;

  await section.getByRole("button", { name: "Comparar tamaños y financiación" }).click();
  await expect(card(page, 100)).toBeVisible({ timeout: 60_000 });
  expect(kitRequests.length).toBeGreaterThan(before); // pidió los kits de los otros tamaños
  // 50, 75 y 100 %; si dos terminan en el mismo kit del catálogo (paquetes de paneles) queda uno solo y se avisa.
  const n = await cards(page).count();
  expect(n === 2 || n === 3).toBe(true);
  await expect(card(page, 50)).toBeVisible();
  if (n === 2) await expect(section.getByText(/mostramos uno solo/)).toBeVisible();
  await expect(card(page, 100)).toContainText("Tu cálculo actual");
  await expect(card(page, 100).getByRole("button", { name: /Tamaño elegido/ })).toBeDisabled();
  await expect(card(page, 50).getByRole("button", { name: /Usar este tamaño/ })).toBeEnabled();
  // Cada tamaño trae sus dos caminos y los destacados.
  await expect(card(page, 50)).toContainText("Al contado");
  await expect(card(page, 50)).toContainText("Financiado");
  await expect(page.locator(".cmp__badges").first()).toBeVisible();
  await expect(section.getByText(/Supuestos:/)).toBeVisible();
  await expect(section.getByRole("button", { name: "Ocultar la comparación" })).toHaveAttribute("aria-expanded", "true");
});

test("los números del comparador coinciden con los del resto de la pantalla (precio, recuperación y cuota)", async ({ page }) => {
  await buildKit(page);
  await page.locator(".cmp").getByRole("button", { name: "Comparar tamaños y financiación" }).click();
  await expect(card(page, 100)).toBeVisible({ timeout: 60_000 });
  const mine = card(page, 100);

  // Precio del kit y recuperación: los mismos que el total de la pantalla.
  const pageTotal = digits(await page.locator(".wiz__total strong").first().innerText());
  expect(digits(await row(mine, /Precio del kit/).innerText())).toBe(pageTotal);
  const pagePayback = decimal(await page.locator(".wiz__total div", { hasText: "Retorno estimado" }).locator("strong").innerText());
  expect(decimal(await row(mine, /Recuperas la inversión en/).innerText())).toBeCloseTo(pagePayback, 1);

  // Cuota: la del panel «Financia tu kit» con los mismos parámetros.
  await page.getByLabel("Quiero simular la financiación").check();
  await expect(page.locator(".fin__big dd")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".fin__result")).toBeVisible();
  await expect.poll(async () => digits(await page.locator(".fin__big dd").innerText()), { timeout: 30_000 }).toBeGreaterThan(0);
  const finMonthly = digits(await page.locator(".fin__big dd").innerText());
  await expect.poll(async () => digits(await row(mine, /Cuota mensual/).innerText())).toBe(finMonthly);

  // Tamaños menores: cuestan menos y ahorran menos.
  const price = async (p: number) => digits(await row(card(page, p), /Precio del kit/).innerText());
  expect(await price(50)).toBeLessThan(await price(100));
  const save = async (p: number) => digits(await row(card(page, p), /Ahorro mensual/).innerText());
  expect(await save(50)).toBeLessThan(await save(100));
  // Nunca dos tarjetas con el mismo kit y ahorros distintos.
  const prices = await cards(page).evaluateAll((els) => els.map((e) => e.querySelector("dl > div:nth-child(2) dd")?.textContent));
  expect(new Set(prices).size).toBe(prices.length);
});

test("cambiar la cuota inicial recalcula las cuotas, y «Usar este tamaño» cambia el cálculo", async ({ page }) => {
  await buildKit(page);
  await page.locator(".cmp").getByRole("button", { name: "Comparar tamaños y financiación" }).click();
  await expect(card(page, 100)).toBeVisible({ timeout: 60_000 });
  const c100 = card(page, 100);
  const total = digits(await row(c100, /Precio del kit/).innerText());

  const down = async () => digits(await row(c100, /^Cuota inicial/).innerText());
  const d20 = await down();
  expect(Math.abs(d20 - total * 0.2)).toBeLessThanOrEqual(1);
  await page.locator(".cmp__controls").getByRole("combobox", { name: /Cuota inicial/ }).click();
  await page.getByRole("option", { name: "40 %" }).click();
  await expect.poll(down).not.toBe(d20);
  expect(Math.abs((await down()) - total * 0.4)).toBeLessThanOrEqual(1);

  // Elegir el 50 %: el sistema baja a la mitad, el kit vuelve a calcularse y esa tarjeta pasa a ser «tu cálculo».
  const kwpBefore = decimal(await page.locator(".wiz__facts div", { hasText: "Potencia solar" }).locator("dd").first().innerText());
  await card(page, 50).getByRole("button", { name: /Usar este tamaño/ }).click();
  await expect(card(page, 50)).toContainText("Tu cálculo actual", { timeout: 60_000 });
  await expect(card(page, 50).getByRole("button", { name: /Tamaño elegido/ })).toBeDisabled();
  await expect.poll(async () => decimal(await page.locator(".wiz__facts div", { hasText: "Potencia solar" }).locator("dd").first().innerText())).toBeLessThan(kwpBefore * 0.6);
  expect(digits(await page.locator(".wiz__total strong").first().innerText())).toBe(await price50(page));
});

async function price50(page: Page) {
  return digits(await row(card(page, 50), /Precio del kit/).innerText());
}

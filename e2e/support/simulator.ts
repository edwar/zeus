import { expect, type Page } from "@playwright/test";
import { releaseQuoteLimit } from "./db";

type Client = { name: string; email: string; phone: string };

/** Un clic antes de que React hidrate la página no hace nada: se reintenta hasta que aparezca el formulario. */
export async function manualEntry(page: Page) {
  await expect(async () => {
    await page.getByRole("button", { name: /ingresar los datos a mano/i }).click({ timeout: 5_000 });
    await expect(page.getByLabel(/Consumo/i).first()).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 60_000 });
}

/** Recorre el simulador sin factura (datos a mano), ubica "Bucaramanga" y llega al kit calculado. */
export async function buildKit(page: Page) {
  await page.goto("/es/simulator");
  await manualEntry(page);
  await page.getByLabel(/Consumo/i).first().fill("300");
  await page.getByLabel(/Tarifa/i).first().fill("900");
  await page.getByPlaceholder(/Bucaramanga/).fill("Bucaramanga, Santander");
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.locator(".loc__results button").first().click();
  await page.getByRole("button", { name: /calcular mi kit/i }).click();
  await expect(page.locator(".wiz__total")).toBeVisible({ timeout: 60_000 });
}

/** Llena y envía la solicitud. `installer` solo aplica si la zona está cubierta por un equipo. */
export async function sendQuote(page: Page, c: Client, installer?: "zeus" | "own") {
  releaseQuoteLimit(); // una corrida completa pide más de 5 cotizaciones desde la misma conexión
  await page.locator("input[name=name]").fill(c.name);
  await page.locator("input[name=email]").fill(c.email);
  await page.locator("input[name=phone], input[type=tel]").first().fill(c.phone);
  if (installer) await page.locator(`input[name=installer][value=${installer}]`).check();
  // El formulario de la solicitud (hay otro, el de «Guarda tu cálculo», con su propia autorización).
  await page.locator("form", { has: page.locator("input[name=name]") }).locator(".wiz__consent input[type=checkbox]").check();
  await page.getByRole("button", { name: /solicitar/i }).click();
  const done = page.locator(".wiz__done");
  await expect(done).toBeVisible({ timeout: 60_000 });
  return done;
}

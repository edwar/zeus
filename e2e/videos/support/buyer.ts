import { expect, type Page } from "@playwright/test";
import { getDict } from "../../../src/i18n";
import { releaseQuoteLimit } from "../../support/db";

type Lang = "es" | "en";

/** Recorre el simulador sin factura (datos a mano) hasta ver el kit calculado. Es la parte «de relleno»: el video la recorta o la salta. */
export async function quickKit(page: Page, lang: Lang) {
  const t = getDict(lang);
  await page.goto(`/${lang}/simulator`);
  const manual = page.getByRole("button", { name: t.wiz.upload.manual });
  await expect(async () => {
    await manual.click({ timeout: 4_000 });
    await expect(page.getByLabel(t.wiz.review.monthlyKwh)).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 60_000 });
  await page.getByLabel(t.wiz.review.monthlyKwh).fill("300");
  await page.getByLabel(t.wiz.review.tariff).fill("900");
  await page.getByPlaceholder(t.wiz.review.location.placeholder).fill("Bucaramanga, Santander");
  await page.getByRole("button", { name: t.wiz.review.location.find, exact: true }).click();
  await page.locator(".loc__results button").first().click();
  await page.getByRole("button", { name: t.wiz.review.next }).click();
  await expect(page.locator(".wiz__total")).toBeVisible({ timeout: 60_000 });
}

/** Llena y envía la solicitud sin grabar (para preparar una solicitud de demostración). */
export async function quickRequest(page: Page, c: { name: string; email: string; phone: string }) {
  releaseQuoteLimit();
  await page.locator("input[name=name]").fill(c.name);
  await page.locator("input[name=email]").fill(c.email);
  await page.locator("input[name=phone], input[type=tel]").first().fill(c.phone);
  await page.locator("form", { has: page.locator("input[name=name]") }).locator(".wiz__consent input[type=checkbox]").check();
  await page.getByRole("button", { name: /solicitar|request/i }).click();
  await expect(page.locator(".wiz__done")).toBeVisible({ timeout: 60_000 });
}

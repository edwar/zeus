import { expect, test } from "@playwright/test";

// Guía del comprador en la landing: qué hace el cliente en cada paso del flujo.
test("la landing explica el recorrido paso a paso y tiene preguntas frecuentes (es)", async ({ page }) => {
  await page.goto("/es");
  const guide = page.locator("#guia");
  await expect(guide.getByRole("heading", { name: "Qué te toca hacer en cada paso" })).toBeVisible();
  await expect(guide.locator(".guide__step")).toHaveCount(7);
  await expect(guide.locator(".guide__step").first()).toContainText("Calcula tu ahorro");
  await expect(guide.locator(".guide__step").first()).toContainText("Tú haces");
  await expect(guide.locator(".guide__step").first()).toContainText("Recibes");
  await expect(guide.locator(".guide__step").nth(3)).toContainText("Aceptar cotización");
  await page.locator("#guia").screenshot({ path: "/private/tmp/claude-502/-Users-edwar-dev-personal-zeus/4634b759-e5bc-42eb-8bb7-c86a30d84565/scratchpad/guide-es.png" });

  const q = guide.locator("details", { hasText: "¿Pedir la cotización me obliga a comprar?" });
  await expect(q.locator("p")).toBeHidden();
  await q.locator("summary").click();
  await expect(q.locator("p")).toBeVisible();
});

test("el menú lleva a la guía y en inglés sale en inglés", async ({ page }) => {
  await page.goto("/es/products");
  await page.getByRole("link", { name: "Cómo funciona" }).first().click();
  await expect(page).toHaveURL(/\/es#guia$/);
  await expect(page.locator("#guia")).toBeInViewport();

  await page.goto("/en");
  await expect(page.getByRole("heading", { name: "What you need to do at each step" })).toBeVisible();
  await expect(page.locator("#guia .guide__step")).toHaveCount(7);
  await expect(page.locator("#guia")).toContainText("Accept quote");
});

test("en el celular los pasos se leen en una sola columna", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-CO" });
  const page = await ctx.newPage();
  await page.goto("/es#guia");
  await expect(page.locator("#guia .guide__step").first()).toBeVisible();
  const box = await page.locator("#guia .guide__step").first().boundingBox();
  expect(box!.width).toBeLessThanOrEqual(390);
  await page.locator("#guia .guide__step").nth(3).screenshot({ path: "/private/tmp/claude-502/-Users-edwar-dev-personal-zeus/4634b759-e5bc-42eb-8bb7-c86a30d84565/scratchpad/guide-mobile.png" });
  await ctx.close();
});

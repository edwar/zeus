import { expect, test, type Page } from "@playwright/test";
import { CLIENTS } from "./support/env";
import { as, confirmDialog } from "./support/session";
import { buildKit, sendQuote } from "./support/simulator";

// Cotización en PDF + enlace público: el cliente responde sin sesión y el equipo lo ve. Pruebas en serie (comparten la solicitud).
test.describe.configure({ mode: "serial" });

const status = (page: Page) => page.locator(".panel__meta").first();
const share = (page: Page) => page.locator("section", { has: page.getByRole("heading", { name: "Enlace para el cliente" }) });
let link = "";
let quoteId = "";

async function openQuote(page: Page) {
  await page.goto("/es/app/quotes");
  await page.getByRole("link", { name: CLIENTS.link.name }).click();
  await page.waitForURL("**/quotes/*");
  quoteId = page.url().split("/").pop()!;
  await expect(page.getByText(CLIENTS.link.name).first()).toBeVisible();
}

test("el enlace solo se puede generar con el cálculo confirmado; el PDF interno siempre se descarga", async ({ browser, page }) => {
  await buildKit(page);
  await sendQuote(page, CLIENTS.link);

  const admin = await as(browser, "admin");
  await openQuote(admin);
  await expect(share(admin).getByRole("button", { name: /generar enlace/i })).toHaveCount(0);
  await expect(share(admin)).toContainText(/cálculo está confirmado/i);

  const pdf = await admin.request.get(`/api/quotes/${quoteId}/pdf?lang=es`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");

  // La API también lo impide, no solo la interfaz.
  expect((await admin.request.post(`/api/quotes/${quoteId}/share`)).status()).toBe(409);

  await admin.locator(".flow__actions button").filter({ hasText: /contactada/i }).first().click();
  await expect(status(admin)).toContainText("Contactada");
  await admin.locator(".flow__actions button").filter({ hasText: /confirm/i }).first().click();
  await expect(status(admin)).toContainText("Cálculo confirmado");

  await share(admin).getByRole("button", { name: /generar enlace/i }).click();
  link = await share(admin).getByRole("textbox").inputValue();
  expect(link).toMatch(/\/es\/q\/[A-Za-z0-9_-]{43}$/);
  await expect(share(admin).getByRole("link", { name: /whatsapp/i })).toHaveAttribute("href", /^https:\/\/wa\.me\/57\d+\?text=/);
  // Por correo: sin Resend configurado el servidor lo dice y lo deja anotado en el historial (no se envía nada).
  await share(admin).getByRole("button", { name: /enviar por correo/i }).click();
  await expect(share(admin)).toContainText("El envío de correos no está configurado");
  await expect(admin.locator(".flow__log")).toContainText("Enlace de la cotización — correo sin configurar");
  await admin.close();
});

test("el cliente ve su cotización sin iniciar sesión, descarga el PDF y no ve datos de contacto", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "es-CO" });
  const page = await ctx.newPage();
  await page.goto(new URL(link).pathname);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(CLIENTS.link.name);
  await expect(page.locator("main")).not.toContainText(CLIENTS.link.email);
  await expect(page.locator("main")).not.toContainText(CLIENTS.link.phone);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  const token = link.split("/").pop();
  const pdf = await page.request.get(`/api/q/${token}/pdf?lang=es`);
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");
  await ctx.close();
});

test("un token inventado responde 404 y no revela nada", async ({ page }) => {
  const fake = "A".repeat(43);
  // Como el resto de páginas dinámicas, Next la transmite con 200 y muestra el 404 propio (con noindex); lo que importa es que no hay datos.
  await page.goto(`/es/q/${fake}`);
  await expect(page.getByRole("heading", { name: "Esta página se fue a tomar el sol" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/Hola|Cotización solar/);
  expect((await page.request.get(`/api/q/${fake}/pdf`)).status()).toBe(404);
  expect((await page.request.post(`/api/q/${fake}/decision`, { data: { decision: "accepted", total: 1 } })).status()).toBe(404);
  expect((await page.request.post(`/api/q/not-a-token/decision`, { data: { decision: "accepted", total: 1 } })).status()).toBe(400);
});

test("aceptar queda registrado, no aprueba la solicitud y solo cuenta una vez", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "es-CO" });
  const page = await ctx.newPage();
  await page.goto(new URL(link).pathname);
  // Un clic antes de hidratar no hace nada: se reintenta hasta que aparezca el resultado.
  await expect(async () => {
    await page.getByRole("button", { name: "Aceptar cotización" }).click({ timeout: 5_000 });
    await expect(page.getByText("Registramos que aceptas la cotización")).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 60_000 });

  await page.reload();
  await expect(page.getByText("Registramos que aceptas la cotización")).toBeVisible();
  await expect(page.getByRole("button", { name: "Aceptar cotización" })).toHaveCount(0);

  const token = link.split("/").pop();
  const again = await page.request.post(`/api/q/${token}/decision`, { data: { decision: "declined", total: 1 } });
  expect(again.status()).toBe(409); // total distinto o ya respondida: en ambos casos no se sobrescribe
  await page.reload();
  await expect(page.getByText("Registramos que aceptas la cotización")).toBeVisible();
  await ctx.close();

  const admin = await as(browser, "admin");
  await openQuote(admin);
  await expect(share(admin)).toContainText("El cliente aceptó");
  await expect(share(admin)).toContainText(/Falta tu aprobación/);
  await expect(status(admin)).toContainText("Cálculo confirmado"); // aceptar NO aprueba
  await expect(admin.locator(".flow__log")).toContainText("Respuesta del cliente");
  await admin.close();
});

test("generar un enlace nuevo invalida el anterior y borra la respuesta; aprobar cierra el enlace", async ({ browser }) => {
  const admin = await as(browser, "admin");
  await openQuote(admin);
  await share(admin).getByRole("button", { name: /enlace nuevo/i }).click();
  await confirmDialog(admin);
  const fresh = await share(admin).getByRole("textbox").inputValue();
  expect(fresh).not.toBe(link);
  await expect(share(admin)).not.toContainText("El cliente aceptó");

  const old = await admin.request.get(`/api/q/${link.split("/").pop()}/pdf`);
  expect(old.status()).toBe(404);
  expect((await admin.request.get(`/api/q/${fresh.split("/").pop()}/pdf`)).status()).toBe(200);

  // Aprobar (solo kit: no exige equipo) cierra el enlace: ya no admite respuesta ni PDF.
  await admin.locator(".flow__actions button").filter({ hasText: /aprobar/i }).first().click();
  await confirmDialog(admin);
  await expect(status(admin)).toContainText("Aprobada");
  const page = await admin.context().newPage();
  await page.goto(new URL(fresh).pathname);
  await expect(page.getByText("Esta cotización ya no admite respuesta")).toBeVisible();
  expect((await admin.request.get(`/api/q/${fresh.split("/").pop()}/pdf`)).status()).toBe(404);
  await admin.close();
});

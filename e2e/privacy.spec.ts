import { expect, test } from "@playwright/test";
import { unsubscribeToken } from "../src/lib/unsubscribe";
import { CLIENTS } from "./support/env";
import { quoteIdByEmail } from "./support/db";
import { as, confirmDialog } from "./support/session";
import { buildKit, sendQuote } from "./support/simulator";

// Privacidad: baja de correos con enlace firmado y eliminación de los datos de una persona. En serie: comparten la solicitud.
test.describe.configure({ mode: "serial" });

let quoteId = "";
let link = "";
const contact = { name: "E2E Privacidad Contacto", email: "e2e-privacidad-contacto@example.com", phone: "+573005550202" };

test("el cliente se da de baja con el enlace firmado y el equipo ya no le escribe", async ({ browser, page }) => {
  await buildKit(page);
  await sendQuote(page, CLIENTS.privacy);
  quoteId = quoteIdByEmail(CLIENTS.privacy.email);

  const admin = await as(browser, "admin");
  await admin.goto(`/es/app/quotes/${quoteId}`);
  await admin.locator(".flow__actions button").filter({ hasText: /contactada/i }).first().click();
  await expect(admin.locator(".panel__meta").first()).toContainText("Contactada");
  await admin.locator(".flow__actions button").filter({ hasText: /confirm/i }).first().click();
  await expect(admin.locator(".panel__meta").first()).toContainText("Cálculo confirmado");
  const share = admin.locator("section", { has: admin.getByRole("heading", { name: "Enlace para el cliente" }) });
  await share.getByRole("button", { name: /generar enlace/i }).click();
  link = await share.getByRole("textbox").inputValue();
  // Antes de la baja el correo sigue su camino (aquí sin Resend: «no configurado»).
  await share.getByRole("button", { name: /enviar por correo/i }).click();
  await expect(share).toContainText("El envío de correos no está configurado");

  // La persona abre el enlace de su correo: ver la página no la da de baja; hay que confirmar.
  const ctx = await browser.newContext({ locale: "es-CO" });
  const person = await ctx.newPage();
  const token = unsubscribeToken(CLIENTS.privacy.email);
  await person.goto(`/es/unsubscribe/${token}`);
  await expect(person.getByRole("heading", { name: "Dejar de recibir correos de Zeus" })).toBeVisible();
  await expect(person.locator("main")).toContainText("e***@example.com");
  await expect(person.locator("main")).not.toContainText(CLIENTS.privacy.email);
  await expect(person.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect((await person.request.get(`/api/unsubscribe/${token}`)).status(), "un GET no da de baja a nadie").toBe(405);
  await share.getByRole("button", { name: /enviar por correo/i }).click();
  await expect(share).not.toContainText("pidió no recibir correos");

  await person.getByRole("button", { name: "Dejar de recibir correos" }).click();
  await expect(person.getByRole("status")).toContainText("no volveremos a escribirte");
  // Enviar el mismo POST otra vez (como hace un cliente de correo) no falla.
  expect((await person.request.post(`/api/unsubscribe/${token}`)).status()).toBe(200);
  await ctx.close();

  await share.getByRole("button", { name: /enviar por correo/i }).click();
  await expect(share).toContainText("pidió no recibir correos");
  await expect(admin.locator(".flow__log")).toContainText("la persona pidió no recibir correos");
  await admin.close();
});

test("un enlace de baja falso o alterado no sirve", async ({ page }) => {
  const good = unsubscribeToken("e2e-otra-persona@example.com");
  const sig = good.split(".")[1];
  const other = Buffer.from("otra@example.com").toString("base64url");
  for (const bad of [`${other}.${sig}`, "abc", `${good.split(".")[0]}.${"A".repeat(43)}`]) {
    expect((await page.request.post(`/api/unsubscribe/${bad}`)).status(), bad).toBe(400);
    await page.goto(`/es/unsubscribe/${bad}`);
    await expect(page.getByText("Este enlace no es válido")).toBeVisible();
    await expect(page.getByRole("button", { name: "Dejar de recibir correos" })).toHaveCount(0);
  }
});

test("solo el equipo con permiso puede eliminar datos o bloquear correos", async ({ browser, page }) => {
  for (const path of ["/api/privacy/erase", "/api/privacy/suppress"]) {
    expect((await page.request.post(path, { data: { quoteId } })).status(), "sin sesión").toBe(401);
    const installer = await as(browser, "equipo");
    expect((await installer.request.post(path, { data: { quoteId } })).status(), "rol equipo").toBe(403);
    await installer.close();
    const admin = await as(browser, "admin");
    expect((await admin.request.post(path, { data: {} })).status(), "cuerpo inválido").toBe(400);
    expect((await admin.request.post(path, { data: { quoteId: "no-existe" } })).status()).toBe(404);
    await admin.close();
  }
});

test("eliminar los datos de un contacto lo borra por completo, con sus notas y recordatorios", async ({ browser }) => {
  const admin = await as(browser, "admin");
  const created = await admin.request.post("/api/leads", { data: { ...contact, source: "referral", consent: true, note: "Lo recomendó un vecino", followUpOn: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10) } });
  expect(created.status()).toBe(201);
  const { id } = (await created.json()) as { id: string };

  await admin.goto(`/es/app/leads/${id}`);
  await admin.getByRole("button", { name: "Eliminar datos de esta persona" }).click();
  await expect(admin.getByRole("alertdialog")).toContainText(contact.name);
  await expect(admin.getByRole("alertdialog")).toContainText("se conservan por la garantía");
  await confirmDialog(admin);
  await expect(admin).toHaveURL(/\/es\/app\/leads$/);
  expect((await admin.request.get(`/api/leads/${id}`)).status()).toBe(404);
  await admin.close();
});

test("eliminar los datos de una solicitud la anonimiza, anula su enlace y bloquea sus correos", async ({ browser }) => {
  const admin = await as(browser, "admin");
  await admin.goto(`/es/app/quotes/${quoteId}`);
  await admin.getByRole("button", { name: "Eliminar datos de esta persona" }).click();
  await confirmDialog(admin);
  await expect(admin.getByRole("status").filter({ hasText: "Datos eliminados." })).toBeVisible();

  const q = (await (await admin.request.get(`/api/quotes/${quoteId}`)).json()) as { contactName: string; contactEmail: string; contactPhone: string; city: string | null };
  expect(q.contactName).toBe("Datos eliminados");
  expect(q.contactEmail).not.toContain(CLIENTS.privacy.email);
  expect(q.contactPhone).not.toContain(CLIENTS.privacy.phone);
  // El enlace público que se había compartido ya no abre.
  const token = link.split("/").pop();
  expect((await admin.request.get(`/api/q/${token}/pdf?lang=es`)).status()).toBe(404);
  await admin.close();
});

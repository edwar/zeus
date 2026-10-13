import { expect, test, type Page } from "@playwright/test";
import { CLIENTS } from "./support/env";
import { releaseQuoteLimit } from "./support/db";
import { as } from "./support/session";
import { buildKit, sendQuote } from "./support/simulator";

// Guardar y compartir el cálculo del simulador. En serie: comparten el correo de prueba y el contacto que se crea.
test.describe.configure({ mode: "serial" });
test.beforeAll(() => releaseQuoteLimit());

const save = (page: Page) => page.locator(".wiz__save");
const total = (page: Page) => page.locator(".wiz__total strong").first().innerText();
let link = "";
let body: Record<string, unknown> = {};
let savedTotal = "";

test("el kit elegido se guarda con un enlace y al abrirlo vuelve igual, con los precios del día", async ({ page, browser }) => {
  await buildKit(page);
  await expect(save(page).getByRole("heading", { name: "Guarda tu cálculo" })).toBeVisible();
  const before = await total(page);
  await page.getByRole("radio").first().click(); // otra opción de kit (no la recomendada)
  await expect(page.getByRole("radio").first()).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(".wiz__total strong").first()).not.toHaveText(before); // espera a que el kit se recalcule
  savedTotal = await total(page);

  const req = page.waitForRequest((r) => r.url().endsWith("/api/simulations") && r.method() === "POST");
  await save(page).getByRole("button", { name: "Guardar y obtener enlace" }).click();
  body = (await req).postDataJSON();
  link = await save(page).getByRole("textbox", { name: /Tu enlace/ }).inputValue();
  expect(link).toMatch(/\/es\/simulator\?s=[A-Za-z0-9_-]{43}$/);
  expect(body.contact).toBeUndefined(); // sin correo es anónimo: nada de identidad

  // Otra persona (otro navegador) abre el enlace: salta directo al kit con la misma configuración.
  const ctx = await browser.newContext({ locale: "es-CO" });
  const other = await ctx.newPage();
  await other.goto(new URL(link).pathname + new URL(link).search);
  await expect(other.getByText(/Retomaste tu cálculo guardado el/)).toBeVisible({ timeout: 60_000 });
  await expect(other.locator(".wiz__total")).toBeVisible({ timeout: 60_000 });
  await expect(other.getByRole("radio").first()).toHaveAttribute("aria-checked", "true");
  expect(await total(other)).toBe(savedTotal);
  await ctx.close();
});

test("un enlace inventado o vencido avisa y deja hacer un cálculo nuevo", async ({ page }) => {
  await page.goto(`/es/simulator?s=${"A".repeat(43)}`);
  await expect(page.getByText("Ese enlace venció o no existe")).toBeVisible();
  await expect(page.getByRole("button", { name: /ingresar los datos a mano/i })).toBeVisible();
  const res = await page.request.get(`/api/simulations/${"A".repeat(43)}`);
  expect(res.status()).toBe(404);
  expect((await page.request.get("/api/simulations/corto")).status()).toBe(404);
});

test("la API rechaza lo que no cumple: sin autorización, cifras alteradas, origen inventado o campos de más", async ({ page }) => {
  const post = async (patch: Record<string, unknown>) => (await page.request.post("/api/simulations", { data: { ...body, ...patch } })).status();
  const state = body.state as { values: Record<string, string> };
  expect(await post({ contact: { email: "e2e-guardado@example.com", consent: false } })).toBe(400);
  expect(await post({ contact: { email: "e2e-guardado@example.com" } })).toBe(400);
  expect(await post({ source: "event" })).toBe(400);
  expect(await post({ total: -5 })).toBe(400);
  expect(await post({ state: { ...state, values: { ...state.values, monthlyKwh: "abc" } } })).toBe(400);
  expect(await post({ state: { ...state, values: { ...state.values, extra: "x" } } })).toBe(400);
  expect(await post({ state: { ...state, extra: true } })).toBe(400);
  expect((await page.request.post("/api/simulations", { data: "x".repeat(25_000), headers: { "Content-Type": "application/json", "Content-Length": "25000" } })).status()).toBe(413);
});

test("con el correo: queda la autorización, se crea un contacto con su recordatorio y no se duplica", async ({ page, browser }) => {
  releaseQuoteLimit();
  await buildKit(page);
  const form = page.locator(".wiz__savemail");
  await form.getByLabel("Tu correo").fill(CLIENTS.saved.email);
  await form.getByRole("button", { name: "Enviarme el cálculo por correo" }).click();
  await expect(form.getByRole("checkbox")).toBeFocused().catch(() => {}); // sin marcar la autorización el formulario no se envía
  await expect(save(page).getByRole("textbox", { name: /Tu enlace/ })).toHaveCount(0);

  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Enviarme el cálculo por correo" }).click();
  // Sin Resend configurado (las pruebas lo exigen) no sale correo: se dice con claridad y el enlace sigue disponible.
  await expect(save(page).getByText("no pudimos enviar el correo ahora")).toBeVisible();
  await expect(save(page).getByRole("textbox", { name: /Tu enlace/ })).toBeVisible();

  const admin = await as(browser, "admin");
  const list = (await (await admin.request.get("/api/leads")).json()) as { items: { id: string; name: string; email: string | null; phone: string | null; source: string; status: string }[] };
  const found = list.items.filter((l) => l.email === CLIENTS.saved.email);
  expect(found).toHaveLength(1);
  expect(found[0]).toMatchObject({ name: CLIENTS.saved.email, phone: null, source: "simulator", status: "open" });
  const lead = (await (await admin.request.get(`/api/leads/${found[0].id}`)).json()) as { createdBy: string; notes: { body: string }[]; followUps: { note: string; assigneeId: string | null; doneAt: string | null }[] };
  expect(lead.createdBy).toBe("Simulador");
  expect(lead.notes[0].body).toMatch(/Guardó su cálculo: sistema de [\d.]+ kWp/);
  expect(lead.followUps[0]).toMatchObject({ note: "Escribirle: guardó su cálculo en el simulador", assigneeId: null, doneAt: null });

  // Guardar otra vez con el mismo correo no crea otro contacto: deja una nota.
  await form.getByRole("button", { name: "Enviarme el cálculo por correo" }).click();
  await expect(save(page).getByText("no pudimos enviar el correo ahora")).toBeVisible();
  await expect.poll(async () => ((await (await admin.request.get(`/api/leads/${found[0].id}`)).json()) as { notes: { body: string }[] }).notes.length).toBe(2);
  expect(((await (await admin.request.get("/api/leads")).json()) as { items: { email: string | null }[] }).items.filter((l) => l.email === CLIENTS.saved.email)).toHaveLength(1);

  // En pantalla: aparece en Seguimiento → Contactos (con el correo en lugar del teléfono) y su recordatorio en «Todos».
  await admin.goto("/es/app/leads");
  await admin.getByRole("tab", { name: "Contactos" }).click();
  await expect(admin.getByRole("row", { name: new RegExp(CLIENTS.saved.email) })).toBeVisible();
  await admin.getByRole("tab", { name: "Recordatorios" }).click();
  await admin.getByRole("tab", { name: "Todos" }).click();
  await expect(admin.getByText("Escribirle: guardó su cálculo en el simulador")).toBeVisible();
  await admin.close();
});

test("si luego pide su cotización con ese correo, el contacto se enlaza solo", async ({ page, browser }) => {
  releaseQuoteLimit();
  await buildKit(page);
  await sendQuote(page, CLIENTS.saved);
  const admin = await as(browser, "admin");
  const list = (await (await admin.request.get("/api/leads?status=converted")).json()) as { items: { email: string | null; quoteId: string | null }[] };
  const lead = list.items.find((l) => l.email === CLIENTS.saved.email);
  expect(lead?.quoteId).toBeTruthy();
  await admin.close();
});

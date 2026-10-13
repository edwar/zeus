import { expect, test, type Page } from "@playwright/test";
import { todayBogota } from "../src/lib/crm";
import { CLIENTS } from "./support/env";
import { as } from "./support/session";
import { buildKit, sendQuote } from "./support/simulator";

// Seguimiento de contactos (CRM): origen, contactos manuales, recordatorios y embudo por origen. En serie: comparten datos.
test.describe.configure({ mode: "serial" });

const today = todayBogota();
const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
let leadId = "";

const openQuote = async (page: Page, name: string) => {
  await page.goto("/es/app/quotes");
  await page.getByRole("link", { name }).click();
  await page.waitForURL("**/quotes/*");
  await expect(page.getByText(name).first()).toBeVisible();
  return page.url().split("/").pop()!;
};
const quoteApi = async (page: Page, id: string) => (await (await page.request.get(`/api/quotes/${id}`)).json()) as { source: string; lead: { id: string; name: string } | null; events: { subject: string | null; note: string | null }[]; followUps: { note: string; doneAt: string | null }[] };

test("llegar desde el catálogo anota ese origen; sin ?src= es «simulador»", async ({ browser, page }) => {
  await page.goto("/es/products");
  await page.getByRole("link", { name: "Calcular mi ahorro con un kit" }).first().click();
  await expect(page).toHaveURL(/\/es\/simulator\?src=catalog/);
  await buildKit(page);
  await sendQuote(page, CLIENTS.crm);

  // Otra persona que entra directo al simulador, en otra pestaña (sin memoria de origen).
  const ctx = await browser.newContext({ locale: "es-CO" });
  const direct = await ctx.newPage();
  await buildKit(direct);
  await sendQuote(direct, CLIENTS.plain);
  await ctx.close();

  const admin = await as(browser, "admin");
  const id = await openQuote(admin, CLIENTS.crm.name);
  expect((await quoteApi(admin, id)).source).toBe("catalog");
  await expect(admin.getByRole("combobox", { name: "Origen" })).toContainText("Catálogo");
  const idDirect = await openQuote(admin, CLIENTS.plain.name);
  expect((await quoteApi(admin, idDirect)).source).toBe("simulator");
  await admin.close();
});

test("el equipo registra un contacto; no se duplica y exige la autorización de la persona", async ({ browser }) => {
  const admin = await as(browser, "admin");
  // La API lo exige aunque la pantalla no lo dejara.
  const base = { name: "E2E Contacto API", phone: "+573009990000", source: "referral" };
  expect((await admin.request.post("/api/leads", { data: { ...base, consent: false } })).status()).toBe(400);
  expect((await admin.request.post("/api/leads", { data: { ...base, consent: true, source: "simulator" } })).status()).toBe(400);

  await admin.goto("/es/app/leads");
  await admin.getByRole("tab", { name: "Contactos" }).click();
  await admin.getByRole("button", { name: "Nuevo contacto" }).click();
  await admin.getByLabel("Nombre completo").fill(CLIENTS.referral.name);
  await admin.locator("input[type=tel]").fill(CLIENTS.referral.phone);
  await admin.getByLabel("Correo (opcional)").fill(CLIENTS.referral.email);
  await admin.getByLabel("Primera nota (opcional)").fill("Lo recomendó un cliente");
  await admin.getByLabel("Primer recordatorio (opcional)").fill(tomorrow);
  await admin.getByRole("button", { name: "Guardar contacto" }).click();
  await expect(admin.getByText("La persona autorizó")).toBeVisible(); // sin marcar la autorización el formulario no se envía
  await admin.getByRole("checkbox", { name: /La persona autorizó/ }).check();
  await admin.getByRole("button", { name: "Guardar contacto" }).click();
  await admin.waitForURL("**/app/leads/*");
  leadId = admin.url().split("/").pop()!;
  await expect(admin.getByRole("heading", { name: CLIENTS.referral.name })).toBeVisible();
  await expect(admin.locator("main")).toContainText("Referido");
  await expect(admin.locator("main")).toContainText("En seguimiento");
  await expect(admin.locator("main")).toContainText("Lo recomendó un cliente");
  await expect(admin.locator("main")).toContainText("Dar seguimiento");

  // Mismo teléfono: no se duplica y dice de quién es.
  await admin.goto("/es/app/leads");
  await admin.getByRole("tab", { name: "Contactos" }).click();
  await admin.getByRole("button", { name: "Nuevo contacto" }).click();
  await admin.getByLabel("Nombre completo").fill("E2E Otra Persona");
  await admin.locator("input[type=tel]").fill(CLIENTS.referral.phone);
  await admin.getByRole("checkbox", { name: /La persona autorizó/ }).check();
  await admin.getByRole("button", { name: "Guardar contacto" }).click();
  await expect(admin.locator("form .field-error")).toContainText(`Ya existe «${CLIENTS.referral.name}»`);
  await admin.close();
});

test("si el contacto pide su cotización, se enlaza solo y la solicitud conserva el origen «referido»", async ({ browser, page }) => {
  await buildKit(page);
  await sendQuote(page, CLIENTS.referral);

  const admin = await as(browser, "admin");
  const id = await openQuote(admin, CLIENTS.referral.name);
  const q = await quoteApi(admin, id);
  expect(q.source).toBe("referral"); // no «simulador»: heredó el del contacto
  expect(q.lead?.id).toBe(leadId);
  expect(q.events.some((e) => e.subject === "lead")).toBe(true);

  const lead = (await (await admin.request.get(`/api/leads/${leadId}`)).json()) as { status: string; quoteId: string; followUps: { doneAt: string | null; doneBy: string | null }[] };
  expect(lead.status).toBe("converted");
  expect(lead.quoteId).toBe(id);
  expect(lead.followUps.every((f) => f.doneAt && f.doneBy === "Sistema")).toBe(true); // ya no hay nada que seguir

  await expect(admin.locator(".flow__log")).toContainText("Enlazada con un contacto");
  await admin.goto(`/es/app/leads/${leadId}`);
  await expect(admin.locator("main")).toContainText("Ya pidió su cotización");
  await expect(admin.getByRole("link", { name: /Ver la solicitud/ })).toBeVisible();
  // Un contacto ya convertido no se puede marcar como perdido.
  expect((await admin.request.patch(`/api/leads/${leadId}`, { data: { status: "lost", lostReason: "x" } })).status()).toBe(409);
  await admin.close();
});

test("orígenes: el embudo cuenta las solicitudes por canal y no inventa tasas", async ({ browser }) => {
  const admin = await as(browser, "admin");
  const s = (await (await admin.request.get("/api/crm/summary?days=all")).json()) as { rows: { source: string; requests: number; rate: number | null; approved: number }[] };
  const by = (k: string) => s.rows.find((r) => r.source === k)!;
  expect(by("catalog").requests).toBeGreaterThanOrEqual(1);
  expect(by("referral").requests).toBeGreaterThanOrEqual(1);
  expect(by("simulator").requests).toBeGreaterThanOrEqual(1);
  expect(by("event").rate).toBeNull(); // sin solicitudes no hay tasa
  for (const r of s.rows) if (r.requests > 0) expect(r.rate).toBeCloseTo(r.approved / r.requests, 5);
  expect((await admin.request.get("/api/crm/summary?days=7")).status()).toBe(400);

  await admin.goto("/es/app/leads");
  await admin.getByRole("tab", { name: "Orígenes" }).click();
  await expect(admin.getByRole("row", { name: /Catálogo/ })).toBeVisible();
  await expect(admin.getByRole("row", { name: /Referido/ })).toBeVisible();
  await expect(admin.getByText(/Conversión = aprobadas ÷ solicitudes/)).toBeVisible();
  await admin.close();
});

test("recordatorios y notas en la solicitud; la insignia del menú cuenta lo de hoy; corregir el origen queda en el historial", async ({ browser }) => {
  const admin = await as(browser, "admin");
  const id = await openQuote(admin, CLIENTS.crm.name);

  await admin.getByRole("button", { name: "Agregar recordatorio" }).click();
  await admin.getByLabel("Fecha").fill(today);
  await admin.getByLabel("Qué hay que hacer").fill("Llamar para confirmar el consumo");
  await admin.getByRole("button", { name: "Guardar recordatorio" }).click();
  await expect(admin.locator(".crm__list")).toContainText("Llamar para confirmar el consumo");
  await expect(admin.locator(".app__badge")).toHaveText(/^[1-9]/);

  await admin.getByLabel("Notas").fill("El cliente prefiere que lo llamen por la tarde");
  await admin.getByRole("button", { name: "Agregar nota" }).click();
  await expect(admin.getByText("Nota guardada.")).toBeVisible();
  await expect(admin.locator(".flow__log")).toContainText("El cliente prefiere que lo llamen por la tarde");

  // En la pantalla de seguimiento aparece como «Para hoy» con el nombre del cliente; al marcarlo hecho sale de pendientes.
  await admin.goto("/es/app/leads");
  const todaySection = admin.locator("section", { has: admin.getByRole("heading", { name: /Para hoy/ }) });
  await expect(todaySection).toContainText(CLIENTS.crm.name);
  await expect(todaySection).toContainText("Llamar para confirmar el consumo");
  await todaySection.locator(".crm__item", { hasText: "Llamar para confirmar el consumo" }).getByRole("button", { name: "Hecho" }).click();
  await expect(admin.locator("section", { has: admin.getByRole("heading", { name: "Hechos recientemente" }) })).toContainText("Llamar para confirmar el consumo");
  expect((await quoteApi(admin, id)).followUps.every((f) => f.doneAt)).toBe(true);

  // Fecha inválida o asignar a quien no atiende solicitudes: la API lo rechaza.
  expect((await admin.request.post(`/api/quotes/${id}/followups`, { data: { dueOn: "mañana", note: "Llamar" } })).status()).toBe(400);
  expect((await admin.request.post(`/api/quotes/${id}/followups`, { data: { dueOn: today, note: "Llamar", assigneeId: "no-existe" } })).status()).toBe(400);

  await openQuote(admin, CLIENTS.crm.name);
  await admin.getByRole("combobox", { name: "Origen" }).click();
  await admin.getByRole("option", { name: "Evento o feria" }).click();
  await expect(admin.locator(".flow__log")).toContainText("Origen cambiado");
  expect((await quoteApi(admin, id)).source).toBe("event");
  await admin.close();
});

test("solo quien atiende solicitudes entra al seguimiento: el rol equipo no", async ({ browser }) => {
  const e = await as(browser, "equipo");
  await e.goto("/es/app/leads");
  await expect(e).toHaveURL(/\/app\/projects/);
  await expect(e.locator("nav.app__nav")).not.toContainText("Seguimiento");
  for (const [method, url] of [["get", "/api/leads"], ["get", "/api/followups"], ["get", "/api/crm/summary"], ["get", "/api/crm/assignees"], ["post", "/api/leads"]] as const) {
    expect((await e.request[method](url)).status(), url).toBe(403);
  }
  await e.close();
});

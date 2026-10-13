import { expect, test, type Page } from "@playwright/test";
import { cleanupField, seedField } from "./support/db";
import { as } from "./support/session";

// Modo campo: checklist, fotos y firma de conformidad, con y sin conexión. En serie: comparten el proyecto de obra de prueba.
test.describe.configure({ mode: "serial" });

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
let mine = "";
let other = "";
const NAME = "E2E Sistema de campo";

const state = async (page: Page, id = mine) => {
  const r = (await (await page.request.get("/api/field/projects")).json()) as { projects: { id: string; checks: { key: string; done: boolean; note: string | null; doneBy: string | null }[]; materials: { id: string; ready: boolean }[]; milestones: { id: string; done: number }[]; photos: { id: string; checkKey: string | null }[]; handover: { signerName: string } | null }[] };
  return r.projects.find((p) => p.id === id);
};
const field = async (browser: Parameters<typeof as>[0]) => {
  const page = await as(browser, "equipo");
  await page.goto("/es/app/field");
  await expect(page.getByRole("heading", { level: 1, name: "Modo campo" })).toBeVisible();
  return page;
};

test.beforeAll(() => { ({ mine, other } = seedField()); });
test.afterAll(() => cleanupField()); // otras pruebas esperan no encontrar proyectos ni equipos de obra

test("el equipo ve solo los proyectos de su equipo, con el checklist de su tipo de sistema", async ({ browser }) => {
  const page = await field(browser);
  await expect(page.getByText(NAME)).toBeVisible();
  await expect(page.getByText("E2E Proyecto ajeno")).toHaveCount(0);
  await expect(page.locator(".field__card")).toContainText("Checklist 0 de 11"); // on-grid: 11 pasos (con trámite de red, sin baterías)
  const s = await state(page);
  expect(s!.checks.map((c) => c.key)).toContain("grid");
  expect(s!.checks.map((c) => c.key)).not.toContain("batteries");
  expect(await state(page, other)).toBeUndefined();
  await expect(page.locator("nav.app__nav")).toContainText("Campo");
  await page.close();
});

test("marcar pasos, materiales y avance se guarda en el servidor; el equipo no ve ni toca proyectos ajenos", async ({ browser }) => {
  const page = await field(browser);
  await page.locator(".field__card").getByRole("button", { name: "Abrir" }).click();
  await expect(page).toHaveURL(/\?p=e2e-campo-1/);
  const site = page.locator(".field__check", { hasText: "Sitio y seguridad verificados" });
  await site.getByRole("checkbox").check();
  await expect.poll(async () => (await state(page))!.checks.find((c) => c.key === "site")!.done).toBe(true);
  expect((await state(page))!.checks.find((c) => c.key === "site")!.doneBy).toBe("E2E Instalador");

  await site.getByRole("button", { name: "Nota del paso" }).click();
  await site.getByRole("textbox", { name: "Nota del paso" }).fill("Techo de teja, acceso por escalera");
  await site.getByRole("button", { name: "Guardar nota" }).click();
  await expect.poll(async () => (await state(page))!.checks.find((c) => c.key === "site")!.note).toBe("Techo de teja, acceso por escalera");

  await page.locator(".field__check", { hasText: "Panel E2E" }).getByRole("checkbox").check();
  await expect.poll(async () => (await state(page))!.materials.some((m) => m.ready)).toBe(true);
  await page.getByRole("group", { name: "Montaje E2E" }).getByRole("button", { name: "50", exact: true }).click();
  await expect.poll(async () => (await state(page))!.milestones.some((m) => m.done === 50)).toBe(true);
  await expect(page.locator(".field__status")).toContainText("Todo enviado");

  // Por la API también se aísla: otro proyecto no se puede tocar ni con un id válido.
  const foreign = await page.request.post("/api/field/sync", { data: { ops: [{ id: "op-ajeno-0001", type: "check", projectId: other, key: "site", done: true, at: new Date().toISOString() }] } });
  expect(((await foreign.json()) as { results: { ok: boolean; error?: string }[] }).results[0]).toMatchObject({ ok: false, error: "not_found" });
  await page.close();
});

test("la última escritura gana, el reenvío no duplica y lo inválido se rechaza", async ({ browser }) => {
  const page = await as(browser, "equipo");
  const post = (ops: unknown[]) => page.request.post("/api/field/sync", { data: { ops } });
  const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
  const op = (id: string, done: boolean, at: string) => ({ id, type: "check", projectId: mine, key: "structure", done, at });

  // Primero llega lo más reciente; después, algo más viejo: no lo pisa.
  expect(((await (await post([op("op-nuevo-0001", true, t(-1_000))])).json()) as { results: { ok: boolean }[] }).results[0].ok).toBe(true);
  const stale = (await (await post([op("op-viejo-0001", false, t(-60_000))])).json()) as { results: { ok: boolean; stale?: boolean }[] };
  expect(stale.results[0]).toMatchObject({ ok: true, stale: true });
  expect((await state(page))!.checks.find((c) => c.key === "structure")!.done).toBe(true);
  // Reenviar exactamente lo mismo no cambia nada.
  expect(((await (await post([op("op-nuevo-0001", true, t(-1_000))])).json()) as { results: { ok: boolean }[] }).results[0].ok).toBe(true);
  // Una hora del teléfono en el futuro no vale: se usa la del servidor.
  expect(((await (await post([op("op-futuro-001", true, "2099-01-01T00:00:00Z")])).json()) as { results: { ok: boolean }[] }).results[0].ok).toBe(true);

  // Formatos inválidos: 400, y una operación mala no deja pasar a las demás.
  expect((await post([{ id: "x", type: "check" }])).status()).toBe(400);
  expect((await post([])).status()).toBe(400);
  expect((await post([{ ...op("op-firma-0001", true, t(0)), type: "handover", signerName: "Ana", signature: "data:image/svg+xml;base64,PHN2Zz4=" }])).status()).toBe(400);
  const mixed = (await (await post([{ ...op("op-malo-00001", true, t(-500)), key: "no_existe" }, op("op-bueno-0001", true, t(-400))])).json()) as { results: { id: string; ok: boolean; error?: string }[] };
  expect(mixed.results.find((r) => r.id === "op-malo-00001")).toMatchObject({ ok: false, error: "unknown_check" });
  expect(mixed.results.find((r) => r.id === "op-bueno-0001")!.ok).toBe(true);
  await page.close();
});

test("las fotos se guardan sin URL pública, solo las ve quien puede ver el proyecto y reenviar no duplica", async ({ browser }) => {
  const page = await field(browser);
  await page.locator(".field__card").getByRole("button", { name: "Abrir" }).click();
  const row = page.locator(".field__check", { hasText: "Estructura de soporte" });
  await row.locator('input[type="file"]').setInputFiles({ name: "obra.png", mimeType: "image/png", buffer: PNG });
  await expect.poll(async () => (await state(page))!.photos.length).toBe(1);
  const photo = (await state(page))!.photos[0];
  expect(photo.checkKey).toBe("structure");
  await expect(row).toContainText("1"); // contador de fotos del paso

  const img = await page.request.get(`/api/field/photos/${photo.id}`);
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toBe("image/png");
  expect(img.headers()["cache-control"]).toContain("private");
  expect(img.headers()["x-content-type-options"]).toBe("nosniff");

  // Reenviar el mismo id no crea otra; un archivo que no es imagen se rechaza por sus bytes.
  const again = await page.request.post("/api/field/photos", { multipart: { id: photo.id, projectId: mine, takenAt: new Date().toISOString(), file: { name: "x.png", mimeType: "image/png", buffer: PNG } } });
  expect((await again.json()) as { duplicate?: boolean }).toMatchObject({ duplicate: true });
  expect((await state(page))!.photos).toHaveLength(1);
  const fake = await page.request.post("/api/field/photos", { multipart: { id: "foto-falsa-0001", projectId: mine, takenAt: new Date().toISOString(), file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("<svg onload=alert(1)>") } } });
  expect(fake.status()).toBe(415);
  // En un proyecto ajeno: ni subir ni ver.
  const foreign = await page.request.post("/api/field/photos", { multipart: { id: "foto-ajena-0001", projectId: other, takenAt: new Date().toISOString(), file: { name: "x.png", mimeType: "image/png", buffer: PNG } } });
  expect(foreign.status()).toBe(404);
  await page.close();

  const admin = await as(browser, "admin");
  expect((await admin.request.get(`/api/field/photos/${photo.id}`)).status()).toBe(200); // la oficina sí
  expect((await admin.request.get("/api/field/photos/no-existe-0001")).status()).toBe(404);
  await admin.close();
  const anon = await browser.newContext();
  expect((await anon.request.get(`/api/field/photos/${photo.id}`)).status()).toBe(401); // sin sesión, nada
  await anon.close();
});

test("sin conexión todo se guarda en el teléfono y al volver la señal se envía solo", async ({ browser }) => {
  const page = await field(browser);
  await page.locator(".field__card").getByRole("button", { name: "Abrir" }).click();
  await expect(page.locator(".field__status")).toContainText("En línea");
  const ctx = page.context();

  await ctx.setOffline(true);
  await expect(page.locator(".field__status")).toContainText("Sin conexión");
  await page.locator(".field__check", { hasText: "Paneles montados" }).getByRole("checkbox").check();
  await page.locator(".field__check", { hasText: "Puesta a tierra" }).getByRole("checkbox").check();
  await page.locator(".field__check", { hasText: "Inversor Instalado".toLowerCase() }).or(page.locator(".field__check", { hasText: "Inversor instalado" })).getByRole("checkbox").check();
  await page.locator(".field__check", { hasText: "Inversor E2E" }).getByRole("checkbox").check();
  await page.locator(".field__check", { hasText: "Área limpia" }).locator('input[type="file"]').setInputFiles({ name: "sin-senal.png", mimeType: "image/png", buffer: PNG });
  // La pantalla responde al instante y dice cuánto está sin enviar.
  await expect(page.locator(".field__check", { hasText: "Paneles montados" })).toHaveClass(/is-done/);
  await expect(page.locator(".field__status")).toContainText(/5 sin enviar/);
  await expect(page.getByText("Sin enviar").first()).toBeVisible(); // la foto pendiente se ve en la galería
  // El servidor todavía no sabe nada.
  const before = await (await browser.newContext({ storageState: "e2e/.auth/equipo.json" })).request.get("/api/field/projects");
  expect(((await before.json()) as { projects: { checks: { key: string; done: boolean }[] }[] }).projects[0].checks.find((c) => c.key === "panels")!.done).toBe(false);

  await ctx.setOffline(false);
  await expect(page.locator(".field__status")).toContainText("Todo enviado", { timeout: 30_000 });
  const s = (await state(page))!;
  for (const k of ["panels", "ground", "inverter"]) expect(s.checks.find((c) => c.key === k)!.done, k).toBe(true);
  expect(s.materials.every((m) => m.ready)).toBe(true);
  expect(s.photos.some((p) => p.checkKey === "clean")).toBe(true);
  await page.close();
});

test("la oficina ve en la pestaña «Instalación» lo mismo que el equipo marcó y fotografió", async ({ browser }) => {
  const admin = await as(browser, "admin");
  await admin.goto(`/es/app/projects/${mine}`);
  await admin.getByRole("tab", { name: "Instalación" }).click();
  const panel = admin.getByRole("tabpanel", { name: "Instalación" });
  await expect(panel.getByRole("heading", { name: "Checklist de instalación" })).toBeVisible();
  await expect(panel.locator(".field__check.is-done", { hasText: "Paneles montados" })).toContainText("por E2E Instalador");
  await expect(panel.locator(".field__check", { hasText: "Sitio y seguridad" })).toContainText("Techo de teja, acceso por escalera"); // la nota del paso
  expect(await panel.locator(".field__photos img").count()).toBeGreaterThanOrEqual(2);
  await expect(panel.getByText("Aún no se ha firmado la entrega.")).toBeVisible();
  await expect(panel.getByRole("link", { name: "Abrir en modo campo" })).toHaveAttribute("href", `/es/app/field?p=${mine}`);
  await admin.close();
});

test("la entrega exige el checklist completo; firmada, queda el acta en PDF y solo gestión la anula", async ({ browser }) => {
  const page = await field(browser);
  await page.locator(".field__card").getByRole("button", { name: "Abrir" }).click();
  const submit = page.getByRole("button", { name: "Firmar y entregar" });
  await expect(page.getByText(/Faltan \d+ paso\(s\) del checklist/)).toBeVisible();
  await expect(submit).toBeDisabled();
  // El servidor también lo exige: sin checklist completo la entrega se rechaza.
  const png = "data:image/png;base64,iVBORw0KGgo=";
  const early = await page.request.post("/api/field/sync", { data: { ops: [{ id: "op-entrega-001", type: "handover", projectId: mine, signerName: "Ana Pérez", signature: png, at: new Date().toISOString() }] } });
  expect(((await early.json()) as { results: { error?: string }[] }).results[0].error).toBe("checklist_incomplete");

  // Completa lo que falta.
  const boxes = page.locator(".field__check input[type=checkbox]");
  for (let i = 0; i < (await boxes.count()); i++) if (!(await boxes.nth(i).isChecked())) await boxes.nth(i).check();
  await expect.poll(async () => (await state(page))!.checks.every((c) => c.done)).toBe(true);
  await expect(page.getByText(/Faltan \d+ paso\(s\)/)).toHaveCount(0);

  await page.getByLabel("Nombre de quien recibe").fill("Ana Pérez");
  await expect(submit).toBeDisabled(); // falta la firma
  const pad = page.locator(".sig__pad");
  await pad.scrollIntoViewIfNeeded(); // el ratón solo alcanza lo que está en la pantalla visible
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 140, box.y + 90, { steps: 6 });
  await page.mouse.move(box.x + 60, box.y + 120, { steps: 6 });
  await page.mouse.up();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByText(/Entregado el .* recibió Ana Pérez/)).toBeVisible();
  await expect.poll(async () => (await state(page))!.handover?.signerName).toBe("Ana Pérez");

  const pdf = await page.request.get(`/api/projects/${mine}/acta?lang=es`);
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");
  expect(pdf.headers()["content-type"]).toBe("application/pdf");

  // Con el acta firmada no se puede firmar otra (ni desmarcar pasos desde la pantalla).
  const again = await page.request.post("/api/field/sync", { data: { ops: [{ id: "op-entrega-002", type: "handover", projectId: mine, signerName: "Otra Persona", signature: png, at: new Date().toISOString() }] } });
  expect(((await again.json()) as { results: { error?: string }[] }).results[0].error).toBe("already_signed");
  await expect(page.locator(".field__check input[type=checkbox]").first()).toBeDisabled();
  // El equipo en campo no puede anular una firma; gestión sí.
  expect((await page.request.delete(`/api/projects/${mine}/handover`)).status()).toBe(403);
  await page.close();
  const admin = await as(browser, "admin");
  expect((await admin.request.delete(`/api/projects/${mine}/handover`)).status()).toBe(204);
  expect((await admin.request.get(`/api/projects/${mine}/acta`)).status()).toBe(404);
  await admin.close();
});

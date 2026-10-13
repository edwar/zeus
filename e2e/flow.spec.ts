import { expect, test, type Page } from "@playwright/test";
import { CLIENTS, TEAM_NAME } from "./support/env";
import { as, confirmDialog } from "./support/session";
import { buildKit, sendQuote } from "./support/simulator";

// Flujo de negocio de punta a punta. Cada prueba depende de la anterior (equipo → solicitud → proyecto), por eso en serie.
test.describe.configure({ mode: "serial" });

const status = (page: Page) => page.locator(".panel__meta").first();

async function openQuote(page: Page, client: string) {
  await page.goto("/es/app/quotes");
  await page.getByRole("link", { name: client }).click();
  await page.waitForURL("**/quotes/*");
  await expect(page.getByText(client).first()).toBeVisible();
}

/** Abre el único proyecto de la corrida (la tarjeta se enlaza por su título, "Sistema … kWp · ciudad"). La primera visita compila la ruta en `next dev`, de ahí el plazo largo. */
async function openProject(page: Page) {
  await page.goto("/es/app/projects");
  // El clic antes de hidratar no navega: se reintenta hasta que carguen las pestañas.
  await expect(async () => {
    if (!/\/projects\/[^/]+$/.test(page.url())) await page.getByRole("link", { name: /^Sistema .* kWp/ }).first().click({ timeout: 5_000 });
    await expect(page.getByRole("tab", { name: "Cronograma" })).toBeVisible({ timeout: 10_000 });
  }).toPass({ timeout: 120_000 });
}

async function advance(page: Page, steps: { button: RegExp; badge: string }[]) {
  for (const s of steps) {
    await page.locator(".flow__actions button").filter({ hasText: s.button }).first().click();
    if (/aprobar/.test(s.button.source)) await confirmDialog(page); // aprobar pide confirmación
    await expect(status(page)).toContainText(s.badge);
  }
}

test.describe("solicitud → proyecto", () => {
  test("sin equipos en la zona, la solicitud es solo kit y no crea proyecto", async ({ browser, page }) => {
    await buildKit(page);
    const done = await sendQuote(page, CLIENTS.kitOnly);
    await expect(done).toContainText(/solo por el kit/i);

    const admin = await as(browser, "admin");
    await openQuote(admin, CLIENTS.kitOnly.name);
    await advance(admin, [
      { button: /contactada/i, badge: "Contactada" },
      { button: /confirm/i, badge: "Cálculo confirmado" },
      { button: /aprobar/i, badge: "Aprobada" },
    ]);
    await admin.goto("/es/app/projects");
    await expect(admin.getByText("Aún no hay proyectos")).toBeVisible();
    await admin.close();
  });

  test("admin crea un equipo con base en Bucaramanga e integra al instalador", async ({ browser }) => {
    const admin = await as(browser, "admin");
    await admin.goto("/es/app/teams/new");
    await admin.locator("input[name=name]").fill(TEAM_NAME);
    await admin.locator("input[name=contactName]").fill("Contacto E2E");
    await admin.locator("input[type=tel], input[name=phone]").first().fill("3001112233");
    await admin.getByPlaceholder(/Bucaramanga/).fill("Bucaramanga, Santander");
    await admin.getByRole("button", { name: "Buscar" }).click();
    await admin.locator(".loc__results button").first().click();
    await admin.locator("input[name=radiusKm]").fill("100");
    await admin.locator("li label").filter({ hasText: "e2e-equipo@example.com" }).locator("input").check();
    await admin.getByRole("button", { name: /^guardar/i }).click();
    await expect(admin).not.toHaveURL(/\/teams\/new$/);
    await admin.goto("/es/app/teams");
    await expect(admin.getByText(TEAM_NAME)).toBeVisible();
    await admin.close();
  });

  test("con un equipo cercano el simulador ofrece instalación y la solicitud la incluye", async ({ page }) => {
    await buildKit(page);
    await expect(page.locator("input[name=installer]").first()).toBeVisible();
    const done = await sendQuote(page, CLIENTS.install, "zeus");
    await expect(done).toContainText(/Referencia/i);
    await expect(done).not.toContainText(/solo por el kit/i);
  });

  test("al aprobar la solicitud con instalación se crea el proyecto", async ({ browser }) => {
    const admin = await as(browser, "admin");
    await openQuote(admin, CLIENTS.install.name);
    await advance(admin, [
      { button: /contactada/i, badge: "Contactada" },
      { button: /confirm/i, badge: "Cálculo confirmado" },
      { button: /aprobar/i, badge: "Aprobada" },
    ]);
    await admin.goto("/es/app/projects");
    await expect(admin.locator("main")).toContainText(CLIENTS.install.name);
    await admin.close();
  });

  test("portal del cliente: ve su proyecto sin sesión y nada de lo interno", async ({ browser }) => {
    const admin = await as(browser, "admin");
    const list = (await (await admin.request.get("/api/projects")).json()) as { id: string; client: string }[];
    const projectId = list.find((p) => p.client === CLIENTS.install.name)!.id;
    const detail = (await (await admin.request.get(`/api/projects/${projectId}`)).json()) as { portal: { url: string; whatsapp: string } | null };
    expect(detail.portal!.url).toMatch(/\/es\/p\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
    expect(detail.portal!.whatsapp).toMatch(/^https:\/\/wa\.me\/57\d+\?text=/);

    // El rol equipo no recibe el enlace del portal (ni nada del cliente).
    const eq = await as(browser, "equipo");
    expect(((await (await eq.request.get(`/api/projects/${projectId}`)).json()) as { portal: unknown }).portal).toBeNull();
    await eq.close();

    // Un hito de prueba (se quita al final) para ver el cronograma en el portal sin tocar lo que esperan las otras pruebas.
    const added = await admin.request.post(`/api/projects/${projectId}/milestones`, { data: { label: "Hito E2E visible", startDate: new Date().toISOString().slice(0, 10), len: 2, crew: "A" } });
    expect(added.status()).toBe(201);
    const mid = ((await added.json()) as { id: string }).id;

    const ctx = await browser.newContext({ locale: "es-CO" });
    const page = await ctx.newPage();
    await page.goto(new URL(detail.portal!.url).pathname);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(CLIENTS.install.name);
    await expect(page.locator(".track")).toContainText("Visita técnica");
    await expect(page.locator(".track .is-cur")).toContainText("Visita técnica");
    await expect(page.locator(".prog__item")).toContainText("Hito E2E visible");
    await expect(page.getByText("Generación solar")).toBeVisible();
    await expect(page.getByText(/no una medición/)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    // Lista blanca: nada de cuadrillas, equipo, responsable, contacto ni tarifas.
    const body = page.locator("body");
    for (const secret of ["Cuadrilla", "Ingeniería A", TEAM_NAME, "E2E Admin", CLIENTS.install.email, CLIENTS.install.phone, "Alerta", "cobra"]) {
      await expect(body, secret).not.toContainText(secret);
    }
    const pdf = await page.request.get(`/api/p/${new URL(detail.portal!.url).pathname.split("/").pop()}/quote-pdf?lang=es`);
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");

    // Firma alterada o proyecto ajeno: el mismo 404 propio, sin pistas.
    const [id] = new URL(detail.portal!.url).pathname.split("/").pop()!.split(".");
    for (const bad of [`${id}.${"A".repeat(43)}`, `otro-id.${"A".repeat(43)}`, "basura"]) {
      await page.goto(`/es/p/${bad}`);
      await expect(page.getByRole("heading", { name: "Esta página se fue a tomar el sol" })).toBeVisible();
      expect((await page.request.get(`/api/p/${bad}/quote-pdf`)).status()).toBe(404);
    }
    await ctx.close();
    expect((await admin.request.delete(`/api/projects/${projectId}/milestones/${mid}`)).status()).toBe(204);
    await admin.close();
  });

  test("portal: solo ve los documentos que se marcaron como compartidos", async ({ browser }) => {
    const admin = await as(browser, "admin");
    const list = (await (await admin.request.get("/api/projects")).json()) as { id: string; client: string }[];
    const projectId = list.find((p) => p.client === CLIENTS.install.name)!.id;
    const detail = (await (await admin.request.get(`/api/projects/${projectId}`)).json()) as { portal: { url: string } };
    const ref = detail.portal.url.split("/").pop()!;
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n");
    const post = async (title: string, visibleToClient: string) =>
      ((await (await admin.request.post(`/api/projects/${projectId}/documents`, { multipart: { file: { name: "doc.pdf", mimeType: "application/pdf", buffer: pdf }, kind: "permit", title, visibleToClient } })).json()) as { id: string }).id;
    const shared = await post("Permiso E2E compartido", "true");
    const hidden = await post("Plano E2E interno", "false");

    const ctx = await browser.newContext({ locale: "es-CO" });
    const page = await ctx.newPage();
    await page.goto(new URL(detail.portal.url).pathname);
    await expect(page.getByRole("link", { name: /Permiso E2E compartido/ })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Plano E2E interno");
    expect((await page.request.get(`/api/p/${ref}/docs/${shared}`)).status()).toBe(200);
    expect((await page.request.get(`/api/p/${ref}/docs/${hidden}`)).status()).toBe(404); // existe, pero no es del cliente
    expect((await page.request.get(`/api/p/${"x".repeat(10)}.${"A".repeat(43)}/docs/${shared}`)).status()).toBe(404);

    // Dejar de compartir lo quita al instante; el enlace directo deja de servir.
    expect((await admin.request.patch(`/api/projects/${projectId}/documents/${shared}`, { data: { visibleToClient: false } })).status()).toBe(204);
    expect((await page.request.get(`/api/p/${ref}/docs/${shared}`)).status()).toBe(404);
    await page.reload();
    await expect(page.locator("body")).not.toContainText("Permiso E2E compartido");
    await ctx.close();
    for (const d of [shared, hidden]) expect((await admin.request.delete(`/api/projects/${projectId}/documents/${d}`)).status()).toBe(204);
    await admin.close();
  });

  test("avisos al cliente: aprobar y avanzar de etapa quedan en el historial; retroceder o apagar el aviso no avisa", async ({ browser }) => {
    const admin = await as(browser, "admin");
    const list = (await (await admin.request.get("/api/projects")).json()) as { id: string; client: string }[];
    const projectId = list.find((p) => p.client === CLIENTS.install.name)!.id;
    const detail = (await (await admin.request.get(`/api/projects/${projectId}`)).json()) as { quoteId: string; notifyClient: boolean };
    expect(detail.notifyClient).toBe(true);
    const notices = async () => {
      const q = (await (await admin.request.get(`/api/quotes/${detail.quoteId}`)).json()) as { events: { subject: string | null; note: string | null }[] };
      return q.events.filter((e) => e.subject === "notice").map((e) => e.note);
    };
    // Sin Resend configurado (las pruebas lo exigen) el envío se anota como "skipped": prueba el cableado sin mandar nada.
    expect(await notices()).toEqual(["approved|skipped"]);

    const move = (stage: string) => admin.request.patch(`/api/projects/${projectId}`, { data: { stage } });
    expect((await move("design")).status()).toBe(200);
    expect(await notices()).toContain("stage_design|skipped");
    const afterForward = (await notices()).length;

    expect((await move("visit")).status()).toBe(200); // retroceder no avisa
    expect((await notices()).length).toBe(afterForward);

    expect((await admin.request.patch(`/api/projects/${projectId}`, { data: { notifyClient: false } })).status()).toBe(200);
    expect((await move("install")).status()).toBe(200); // aviso apagado: tampoco
    expect((await notices()).length).toBe(afterForward);

    expect((await admin.request.patch(`/api/projects/${projectId}`, { data: { notifyClient: true } })).status()).toBe(200);
    expect((await move("monitor")).status()).toBe(200);
    expect(await notices()).toContain("stage_monitor|skipped");

    expect((await admin.request.patch(`/api/projects/${projectId}`, { data: {} })).status()).toBe(400);
    expect((await admin.request.patch(`/api/projects/${projectId}`, { data: { stage: "nope" } })).status()).toBe(400);

    // En pantalla: el interruptor del proyecto y el aviso en el historial de la solicitud.
    await admin.goto(`/es/app/projects/${projectId}`);
    const toggle = admin.getByLabel(/Avisar al cliente por correo/);
    await expect(toggle).toBeChecked();
    await toggle.uncheck();
    await expect(toggle).not.toBeChecked();
    await admin.goto(`/es/app/quotes/${detail.quoteId}`);
    await expect(admin.locator(".flow__log")).toContainText("Aviso al cliente");
    await expect(admin.locator(".flow__log")).toContainText("Etapa: diseño de ingeniería — correo sin configurar");
    await admin.close();
  });

  test("portal: enviar el enlace por correo queda anotado y renovarlo invalida el anterior", async ({ browser }) => {
    const admin = await as(browser, "admin");
    const list = (await (await admin.request.get("/api/projects")).json()) as { id: string; client: string }[];
    const projectId = list.find((p) => p.client === CLIENTS.install.name)!.id;
    const get = async () => (await (await admin.request.get(`/api/projects/${projectId}`)).json()) as { quoteId: string; portal: { url: string } };
    const before = await get();

    const sent = await admin.request.post(`/api/projects/${projectId}/portal/email`);
    expect(((await sent.json()) as { outcome: string }).outcome).toBe("skipped"); // sin Resend: se anota, no se envía
    const quote = (await (await admin.request.get(`/api/quotes/${before.quoteId}`)).json()) as { events: { subject: string | null; note: string | null }[] };
    expect(quote.events.some((e) => e.subject === "notice" && e.note === "portal|skipped")).toBe(true);

    const rotated = (await (await admin.request.post(`/api/projects/${projectId}/portal`)).json()) as { url: string };
    expect(rotated.url).not.toBe(before.portal.url);
    expect((await get()).portal.url).toBe(rotated.url);

    const ctx = await browser.newContext({ locale: "es-CO" });
    const page = await ctx.newPage();
    await page.goto(new URL(before.portal.url).pathname);
    await expect(page.getByRole("heading", { name: "Esta página se fue a tomar el sol" })).toBeVisible(); // el viejo ya no vale
    await page.goto(new URL(rotated.url).pathname);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(CLIENTS.install.name);
    await ctx.close();

    // En pantalla: el panel del portal en el resumen del proyecto.
    await admin.goto(`/es/app/projects/${projectId}`);
    await expect(admin.getByRole("heading", { name: "Portal del cliente" })).toBeVisible();
    await expect(admin.getByRole("button", { name: "Enviar por correo" })).toBeVisible();
    await expect(admin.getByRole("link", { name: "Enviar por WhatsApp" })).toHaveAttribute("href", /wa\.me/);
    await admin.close();
  });

  test("admin gestiona el proyecto: cronograma, avance, materiales, monitoreo y alertas", async ({ browser }) => {
    const admin = await as(browser, "admin");
    await openProject(admin);

    await admin.getByRole("tab", { name: "Cronograma" }).click();
    await admin.getByRole("button", { name: "Generar cronograma" }).click();
    await expect(admin.locator("table tbody tr").first()).toBeVisible();

    const progress = admin.locator('input[aria-label^="Avance"]').first();
    await progress.fill("100");
    await progress.press("Enter");
    await expect(async () => {
      await admin.reload();
      await admin.getByRole("tab", { name: "Cronograma" }).click();
      await expect(admin.locator('input[aria-label^="Avance"]').first()).toHaveValue("100", { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });

    await admin.getByRole("tab", { name: "Materiales" }).click();
    await admin.getByRole("button", { name: "Marcar todos" }).click();
    await expect(admin.locator(".check__item input:not(:checked)")).toHaveCount(0);

    await admin.getByRole("tab", { name: "Monitoreo" }).click();
    await admin.getByLabel("Enlace a la app").fill("https://example.com/monitor");
    await admin.getByRole("button", { name: "Guardar enlace" }).click();
    await expect(admin.getByRole("link", { name: /Abrir app/i })).toBeVisible();

    await admin.getByLabel("¿Qué pasó?").fill("Alerta E2E: el inversor no genera");
    await admin.getByRole("button", { name: "Registrar alerta" }).click();
    await expect(admin.getByText("Alerta E2E: el inversor no genera")).toBeVisible();
    await admin.close();
  });
});

test.describe("roles", () => {
  test("Equipo: solo ve Proyectos y el de su equipo, sin controles de gestión", async ({ browser }) => {
    const e = await as(browser, "equipo");
    await e.goto("/es/app");
    await expect(e).toHaveURL(/\/app\/projects/);
    await expect(e.locator("nav.app__nav")).not.toContainText(/Solicitudes|Usuarios|Productos|Equipos/);

    for (const path of ["quotes", "users", "products", "teams", "manufacturers"]) {
      await e.goto(`/es/app/${path}`);
      await expect(e, path).toHaveURL(/\/app\/projects/);
    }

    await openProject(e);
    await expect(e.getByRole("button", { name: "Agregar hito" })).toHaveCount(0);
    await e.getByRole("tab", { name: "Monitoreo" }).click();
    await expect(e.getByRole("button", { name: "Cambiar enlace" })).toHaveCount(0);

    // Los permisos se aplican también en el servidor, no solo en la interfaz.
    expect((await e.request.get("/api/quotes")).status()).toBe(403);
    expect((await e.request.get("/api/teams")).status()).toBe(403);
    expect((await e.request.get("/api/projects")).status()).toBe(200);
    await e.close();
  });

  test("Gestión: solicitudes, proyectos y equipos sí; usuarios y catálogo no", async ({ browser }) => {
    const g = await as(browser, "gestion");
    for (const path of ["quotes", "projects", "teams"]) {
      await g.goto(`/es/app/${path}`);
      await expect(g, path).toHaveURL(new RegExp(`/app/${path}`));
    }
    for (const path of ["users", "products", "manufacturers"]) {
      await g.goto(`/es/app/${path}`);
      await expect(g, path).toHaveURL(/\/app\/quotes/);
    }
    await g.close();
  });
});

import { expect, test, type Page } from "@playwright/test";
import { as, confirmDialog } from "./support/session";

// Casos reales: nada se publica sin la autorización del cliente y el ahorro verificado; retirar un caso es inmediato.
test.describe.configure({ mode: "serial" });

const TITLE = "E2E Panadería que bajó su factura";
const CONSENT = "Constancia E2E-7731: autorización escrita por WhatsApp el 5 de julio de 2026.";
const EVIDENCE = "Facturas de ESSA de febrero y de junio de 2026, comparadas con el mismo consumo.";
let id = "";
let slug = "";

const caseApi = async (page: Page) => (await (await page.request.get(`/api/cases/${id}`)).json()) as { slug: string; status: string; missing: string[] };

test("sin casos publicados el sitio no muestra la sección ni la página de casos", async ({ page, browser }) => {
  const admin = await as(browser, "admin");
  const list = (await (await admin.request.get("/api/cases")).json()) as { items: { status: string }[] };
  await admin.close();
  test.skip(list.items.some((c) => c.status === "published"), "ya hay casos reales publicados en esta base: no se puede probar el estado vacío");
  await page.goto("/es");
  await expect(page.locator("#casos")).toHaveCount(0);
  await page.goto("/es/cases");
  await expect(page.getByRole("heading", { name: "Esta página se fue a tomar el sol" })).toBeVisible();
});

test("el equipo crea un borrador; se calcula el ahorro y solo falta la autorización", async ({ browser }) => {
  const admin = await as(browser, "admin");
  await admin.goto("/es/app/cases/new");
  await admin.getByLabel("Título (español)").fill(TITLE);
  await admin.getByLabel("Resumen (español)").fill("Una panadería de Girardot instaló 4 kWp y su factura mensual de energía bajó de forma notable.");
  await admin.getByLabel("Testimonio del cliente (español, opcional)").fill("Ya no le tengo miedo a la factura de luz.");
  await admin.getByLabel("Cómo aparecerá el cliente").fill("Panadería E2E");
  await admin.getByLabel("Ciudad o municipio").fill("Girardot");
  await admin.getByLabel("Potencia instalada (kWp)").fill("4");
  await admin.getByLabel("Fecha de instalación").fill("2026-03-01");
  await admin.getByLabel("Factura mensual antes (COP)").fill("1200000");
  await admin.getByLabel("Factura mensual después (COP)").fill("380000");
  await expect(admin.getByText(/Ahorro: .*820\.000 al mes \(68 %\)/)).toBeVisible();
  await admin.getByLabel("Cómo se verificó").fill(EVIDENCE);
  await admin.getByLabel("Fecha de la verificación").fill("2026-07-10");
  await admin.getByRole("button", { name: "Crear borrador" }).click();
  await admin.waitForURL(/\/app\/cases\/(?!new$)[^/]+$/); // la propia página «nuevo» también coincide con /cases/*
  id = admin.url().split("/").pop()!;

  // Solo falta lo más importante; el botón de publicar está apagado.
  const missing = admin.locator(".case__missing li");
  await expect(missing).toHaveCount(1);
  await expect(missing).toHaveText("La autorización del cliente y cómo la dio");
  await expect(admin.getByRole("button", { name: "Publicar caso" })).toBeDisabled();
  const c = await caseApi(admin);
  slug = c.slug;
  expect(slug).toBe("e2e-panaderia-que-bajo-su-factura");
  expect(c.missing).toEqual(["consent"]);

  // El servidor también lo exige, no solo la pantalla.
  const res = await admin.request.post(`/api/cases/${id}/publish`, { data: { publish: true } });
  expect(res.status()).toBe(409);
  expect(((await res.json()) as { missing: string[] }).missing).toEqual(["consent"]);
  await admin.close();
});

test("un borrador no se ve en el sitio", async ({ page }) => {
  await page.goto(`/es/cases/${slug}`);
  await expect(page.getByRole("heading", { name: "Esta página se fue a tomar el sol" })).toBeVisible();
  await page.goto("/es");
  await expect(page.locator("#casos")).toHaveCount(0);
});

test("registrar la autorización exige la constancia; con ella el caso se publica", async ({ browser }) => {
  const admin = await as(browser, "admin");
  // Una constancia de dos letras no vale (el servidor lo rechaza aunque la pantalla se saltara).
  expect((await admin.request.post(`/api/cases/${id}/consent`, { data: { given: true, note: "sí" } })).status()).toBe(400);
  expect((await admin.request.post(`/api/cases/${id}/consent`, { data: { given: true } })).status()).toBe(400);

  await admin.goto(`/es/app/cases/${id}`);
  await admin.getByLabel("Cómo y cuándo la dio").fill(CONSENT);
  await admin.getByRole("button", { name: "Registrar autorización" }).click(); // sin marcar la casilla el formulario no se envía
  await expect(admin.getByText(/Autorización registrada el/)).toHaveCount(0);
  await admin.getByRole("checkbox", { name: /Confirmo que el cliente autorizó/ }).check();
  await admin.getByRole("button", { name: "Registrar autorización" }).click();
  await expect(admin.getByText(/Autorización registrada el .* por E2E Admin/)).toBeVisible();
  await expect(admin.getByText("Todo listo: el caso cumple lo necesario para publicarse.")).toBeVisible();

  await admin.getByRole("button", { name: "Publicar caso" }).click();
  await expect(admin.getByText(/Publicado el .* por E2E Admin/)).toBeVisible();
  expect((await caseApi(admin)).status).toBe("published");
  await admin.close();
});

test("publicado: aparece en la landing y su ficha muestra el resultado, cómo se verificó y el testimonio; sin datos internos", async ({ page, request }) => {
  await page.goto("/es");
  const section = page.locator("#casos");
  await expect(section.getByRole("heading", { name: "Clientes que ya bajaron su factura" })).toBeVisible();
  const card = section.getByRole("link", { name: new RegExp(TITLE) });
  await expect(card).toContainText("Ahorra 68 %");
  await expect(card).toContainText("$ 1.200.000 → $ 380.000");
  await expect(card).toContainText("4 kWp");
  await expect(section).toContainText("Los resultados corresponden a este cliente");

  await card.click();
  await expect(page).toHaveURL(new RegExp(`/es/cases/${slug}$`));
  // Next conserva la página anterior oculta tras navegar: se mira solo la ficha visible.
  const detail = page.locator("article.case:visible");
  await expect(detail.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
  await expect(detail.locator(".case__big")).toHaveText("Ahorra 68 %");
  await expect(detail.getByText("$ 820.000 menos cada mes")).toBeVisible();
  await expect(detail.locator(".case__verified")).toContainText("Verificado el 10 de julio de 2026");
  await expect(detail.locator(".case__verified")).toContainText(EVIDENCE);
  await expect(detail.locator(".case__quote")).toContainText("Ya no le tengo miedo a la factura de luz.");
  await expect(detail.locator(".case__quote footer")).toContainText("Panadería E2E, Girardot");
  await expect(detail.getByRole("link", { name: "Calcular mi ahorro" })).toHaveAttribute("href", "/es/simulator");

  // Nada interno llega al público: ni la constancia de la autorización ni quién la registró.
  const html = await (await request.get(`/es/cases/${slug}`)).text();
  for (const secret of [CONSENT, "E2E-7731", "E2E Admin", "consentAt", "createdBy"]) expect(html, secret).not.toContain(secret);

  // En inglés, sin textos en inglés se usa el español, pero las etiquetas van en inglés.
  await page.goto(`/en/cases/${slug}`);
  await expect(page.locator("article.case:visible").getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
  await expect(page.locator("article.case:visible .case__verified")).toContainText("Verified result");
  await expect(page.locator("article.case:visible .case__big")).toHaveText("Saves 68 %");

  const map = await (await request.get("/sitemap.xml")).text();
  expect(map).toContain(`/es/cases/${slug}`);
  expect(map).toContain("/es/cases</loc>");
});

test("un caso publicado no puede quedar incompleto al editarlo, y se puede corregir lo demás", async ({ browser }) => {
  const admin = await as(browser, "admin");
  const full = { titleEs: TITLE, summaryEs: "Una panadería de Girardot instaló 4 kWp y su factura mensual de energía bajó de forma notable.", displayName: "Panadería E2E", town: "Girardot", kwp: 4, installedOn: "2026-03-01", billBefore: 1_200_000, billAfter: 380_000, evidence: EVIDENCE, verifiedOn: "2026-07-10" };
  const bad = await admin.request.put(`/api/cases/${id}`, { data: { ...full, evidence: "" } });
  expect(bad.status()).toBe(409);
  expect(((await bad.json()) as { missing: string[] }).missing).toEqual(["evidence"]);
  expect((await admin.request.put(`/api/cases/${id}`, { data: { ...full, billAfter: 1_300_000 } })).status()).toBe(409); // ya no ahorraría
  expect((await admin.request.put(`/api/cases/${id}`, { data: { ...full, summaryEs: `${full.summaryEs} Ahora con más detalle.` } })).status()).toBe(200);
  await admin.close();
});

test("retirar la autorización despublica el caso al instante en todo el sitio", async ({ browser, page }) => {
  const admin = await as(browser, "admin");
  await admin.goto(`/es/app/cases/${id}`);
  await admin.getByRole("button", { name: "Retirar autorización" }).click();
  await confirmDialog(admin);
  await expect(admin.getByText("Registrar autorización")).toBeVisible();
  expect((await caseApi(admin)).status).toBe("draft"); // volvió a borrador
  await expect(admin.getByRole("button", { name: "Publicar caso" })).toBeDisabled();

  // Inmediato: ni la ficha ni la landing sirven lo anterior desde el caché.
  await page.goto(`/es/cases/${slug}`);
  await expect(page.getByRole("heading", { name: "Esta página se fue a tomar el sol" })).toBeVisible();
  await page.goto("/es");
  await expect(page.locator("#casos").getByText(TITLE)).toHaveCount(0);
  await admin.close();
});

test("el equipo de instalación no entra a casos; la API tampoco", async ({ browser }) => {
  const e = await as(browser, "equipo");
  await e.goto("/es/app/cases");
  await expect(e).toHaveURL(/\/app\/projects/);
  await expect(e.locator("nav.app__nav")).not.toContainText("Casos");
  for (const [method, url] of [["get", "/api/cases"], ["post", "/api/cases"], ["get", `/api/cases/${id}`]] as const) expect((await e.request[method](url)).status(), url).toBe(403);
  await e.close();
});

test("fotos: sin almacenamiento configurado se avisa; el tipo se decide por los bytes", async ({ browser }) => {
  const admin = await as(browser, "admin");
  await admin.goto(`/es/app/cases/${id}`);
  const detail = (await (await admin.request.get(`/api/cases/${id}`)).json()) as { storageReady: boolean };
  if (!detail.storageReady) {
    await expect(admin.getByText(/Falta configurar el almacenamiento de imágenes/)).toBeVisible();
    await expect(admin.getByLabel("Subir una foto")).toBeDisabled();
    const res = await admin.request.post(`/api/cases/${id}/photos`, { multipart: { file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("no es una imagen") } } });
    expect(res.status()).toBe(503);
  } else {
    // Con almacenamiento: un archivo que dice ser png pero es texto se rechaza por sus bytes.
    const res = await admin.request.post(`/api/cases/${id}/photos`, { multipart: { file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("<svg onload=alert(1)>") } } });
    expect(res.status()).toBe(415);
  }
  await admin.close();
});

test("eliminar un caso lo borra del todo", async ({ browser }) => {
  const admin = await as(browser, "admin");
  await admin.goto(`/es/app/cases/${id}`);
  await admin.getByRole("button", { name: "Eliminar caso" }).click();
  await confirmDialog(admin);
  await admin.waitForURL("**/app/cases");
  expect((await admin.request.get(`/api/cases/${id}`)).status()).toBe(404);
  await admin.close();
});

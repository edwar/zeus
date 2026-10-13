import { expect, test } from "@playwright/test";
import { cleanupField, seedField } from "./support/db";
import { as, confirmDialog } from "./support/session";

// Documentos del proyecto: privados, validados por sus bytes y con permisos por rol y por equipo.
test.describe.configure({ mode: "serial" });

const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
let mine = "";
let other = "";
let docId = "";

test.beforeAll(() => { ({ mine, other } = seedField("docs")); });
test.afterAll(() => cleanupField());

const upload = (page: Awaited<ReturnType<typeof as>>, project: string, file: { name: string; mimeType: string; buffer: Buffer }, extra: Record<string, string> = {}) =>
  page.request.post(`/api/projects/${project}/documents`, { multipart: { file, kind: "plan", title: "Plano unifilar E2E", ...extra } });

test("la oficina sube un PDF desde la pestaña, queda privado y se descarga con sus bytes", async ({ browser }) => {
  const admin = await as(browser, "admin");
  await admin.goto(`/es/app/projects/${mine}`);
  await admin.getByRole("tab", { name: "Documentos" }).click();
  await expect(admin.getByText("Aún no hay documentos")).toBeVisible();
  await admin.getByLabel("Archivo").setInputFiles({ name: "plano.pdf", mimeType: "application/pdf", buffer: PDF });
  await admin.getByLabel("Nombre (opcional)").fill("Plano unifilar E2E");
  await admin.getByRole("button", { name: "Subir documento" }).click();
  const row = admin.locator(".pdocs__row", { hasText: "Plano unifilar E2E" });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Plano o diseño");
  const list = (await (await admin.request.get(`/api/projects/${mine}/documents`)).json()) as { id: string; visibleToClient: boolean }[];
  expect(list).toHaveLength(1);
  expect(list[0].visibleToClient).toBe(false); // por defecto, privado
  docId = list[0].id;
  const dl = await admin.request.get(`/api/projects/${mine}/documents/${docId}`);
  expect(dl.status()).toBe(200);
  expect(dl.headers()["content-type"]).toBe("application/pdf");
  expect(dl.headers()["content-disposition"]).toMatch(/^attachment; filename="plano\.pdf"$/);
  expect(dl.headers()["x-content-type-options"]).toBe("nosniff");
  expect(Buffer.compare(await dl.body(), PDF)).toBe(0);
  await admin.close();
});

test("el tipo se decide por los bytes: un HTML disfrazado de PDF se rechaza", async ({ browser }) => {
  const admin = await as(browser, "admin");
  const fake = await upload(admin, mine, { name: "x.pdf", mimeType: "application/pdf", buffer: Buffer.from("<html><script>alert(1)</script></html>") });
  expect(fake.status()).toBe(415);
  expect((await upload(admin, mine, { name: "foto.png", mimeType: "image/png", buffer: PNG }, { kind: "other", title: "Foto del tablero" })).status()).toBe(201);
  expect((await upload(admin, mine, { name: "x.pdf", mimeType: "application/pdf", buffer: PDF }, { kind: "nope" })).status()).toBe(400);
  expect((await upload(admin, mine, { name: "grande.pdf", mimeType: "application/pdf", buffer: Buffer.concat([PDF, Buffer.alloc(4_100_000)]) })).status()).toBe(413);
  await admin.close();
});

test("el equipo ve y descarga los de su proyecto pero no sube, cambia ni borra; los de otro equipo no existen para él", async ({ browser }) => {
  const admin = await as(browser, "admin");
  const foreign = await upload(admin, other, { name: "ajeno.pdf", mimeType: "application/pdf", buffer: PDF }, { title: "Documento ajeno E2E" });
  const foreignId = ((await foreign.json()) as { id: string }).id;
  await admin.close();

  const eq = await as(browser, "equipo");
  expect((await eq.request.get(`/api/projects/${mine}/documents`)).status()).toBe(200);
  expect((await eq.request.get(`/api/projects/${mine}/documents/${docId}`)).status()).toBe(200);
  expect((await upload(eq, mine, { name: "a.pdf", mimeType: "application/pdf", buffer: PDF })).status()).toBe(403);
  expect((await eq.request.patch(`/api/projects/${mine}/documents/${docId}`, { data: { visibleToClient: true } })).status()).toBe(403);
  expect((await eq.request.delete(`/api/projects/${mine}/documents/${docId}`)).status()).toBe(403);
  // Proyecto ajeno: la lista y la descarga responden como si no existieran; y un id de otro proyecto no sirve por el camino del propio.
  expect((await eq.request.get(`/api/projects/${other}/documents`)).status()).toBe(404);
  expect((await eq.request.get(`/api/projects/${other}/documents/${foreignId}`)).status()).toBe(404);
  expect((await eq.request.get(`/api/projects/${mine}/documents/${foreignId}`)).status()).toBe(404);
  await eq.goto(`/es/app/projects/${mine}`);
  await eq.getByRole("tab", { name: "Documentos" }).click();
  await expect(eq.locator(".pdocs__row", { hasText: "Plano unifilar E2E" })).toBeVisible();
  await expect(eq.getByRole("heading", { name: "Subir un documento" })).toHaveCount(0);
  await expect(eq.getByRole("button", { name: "Eliminar" })).toHaveCount(0);
  await eq.close();
  expect((await (await browser.newContext()).request.get(`/api/projects/${mine}/documents/${docId}`)).status()).toBe(401);
});

test("eliminar pide confirmación y borra de verdad", async ({ browser }) => {
  const admin = await as(browser, "admin");
  await admin.goto(`/es/app/projects/${mine}`);
  await admin.getByRole("tab", { name: "Documentos" }).click();
  const row = admin.locator(".pdocs__row", { hasText: "Plano unifilar E2E" });
  await row.getByRole("button", { name: "Eliminar" }).click();
  await expect(admin.getByRole("alertdialog")).toContainText("Plano unifilar E2E");
  await admin.getByRole("alertdialog").getByRole("button", { name: "Cancelar" }).click();
  expect((await admin.request.get(`/api/projects/${mine}/documents/${docId}`)).status()).toBe(200);
  await row.getByRole("button", { name: "Eliminar" }).click();
  await confirmDialog(admin);
  await expect(row).toHaveCount(0);
  expect((await admin.request.get(`/api/projects/${mine}/documents/${docId}`)).status()).toBe(404);
  await admin.close();
});

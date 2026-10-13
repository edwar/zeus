import { expect, test } from "@playwright/test";
import { cleanupStock, seedStock } from "./support/db";
import { as, confirmDialog } from "./support/session";

// Inventario propio junto a los productos del proveedor (Autosolar): existencias, costo promedio, descuento por proyecto y margen.
test.describe.configure({ mode: "serial" });

let ids = { own: "", supplier: "", project: "", m1: "", m2: "" };
const OWN = "E2E Panel de bodega";

test.beforeAll(() => { ids = seedStock(); });
test.afterAll(() => cleanupStock());

const api = (page: Awaited<ReturnType<typeof as>>) => ({
  stock: async () => ((await (await page.request.get("/api/stock")).json()) as { productId: string; onHand: number; avgCost: number | null; low: boolean; pending: number }[]).find((r) => r.productId === ids.own),
  ready: (mid: string, ready: boolean) => page.request.patch(`/api/projects/${ids.project}/materials/${mid}`, { data: { ready } }),
  source: (mid: string, source: string) => page.request.patch(`/api/projects/${ids.project}/materials/${mid}`, { data: { source } }),
});

test("el inventario y los costos son de gestión y admin: el equipo de instalación no entra ni por la API", async ({ browser }) => {
  const eq = await as(browser, "equipo");
  for (const url of ["/api/stock", "/api/stock/candidates", `/api/projects/${ids.project}/margin`]) expect((await eq.request.get(url)).status(), url).toBe(403);
  expect((await eq.request.post("/api/stock", { data: { productId: ids.own, onHand: 1, unitCost: 1, minQty: 0 } })).status()).toBe(403);
  await eq.goto("/es/app/stock");
  await expect(eq).not.toHaveURL(/\/app\/stock/);
  await eq.close();
  const g = await as(browser, "gestion");
  expect((await g.request.get("/api/stock")).status()).toBe(200);
  await g.close();
});

test("empezar a llevar inventario de un producto; entradas con costo promedio y conteo con motivo", async ({ browser }) => {
  const admin = await as(browser, "admin");
  await admin.goto("/es/app/stock");
  await admin.getByRole("button", { name: "Llevar inventario de un producto" }).first().click();
  await admin.getByRole("textbox", { name: "Producto" }).fill("E2E Panel de bodega");
  await admin.getByRole("button", { name: /E2E Panel de bodega/ }).click();
  await admin.getByLabel("Unidades que tienes hoy").fill("5");
  await admin.getByLabel("Costo por unidad (COP)").fill("600000");
  await admin.getByLabel("Avisar cuando queden").fill("2");
  await admin.getByRole("button", { name: "Empezar a llevar inventario" }).click();
  const row = admin.locator("tr", { hasText: OWN });
  await expect(row).toBeVisible();
  await expect(row.locator("td").nth(1)).toContainText("5");
  await expect(row).toContainText("600.000");

  await row.getByRole("button", { name: "Registrar entrada" }).click();
  await admin.getByLabel("Unidades que llegaron").fill("5");
  await admin.getByLabel("Costo por unidad (COP)").fill("800000");
  await expect(admin.getByRole("status").filter({ hasText: "Quedarían 10 unidades" })).toContainText("700.000"); // (5×600 + 5×800) ÷ 10
  await admin.getByRole("button", { name: "Registrar entrada" }).last().click();
  await expect(row.locator("td").nth(1)).toContainText("10");
  await expect(row).toContainText("700.000");

  await row.getByRole("button", { name: "Contar" }).click();
  await admin.getByLabel("Unidades que hay realmente").fill("9");
  await admin.getByLabel("Motivo de la diferencia").fill("Conteo E2E: una unidad dañada");
  await admin.getByRole("button", { name: "Guardar conteo" }).click();
  await expect(row.locator("td").nth(1)).toContainText("9");

  await row.getByRole("button", { name: "Historial" }).click();
  const hist = admin.getByRole("dialog");
  await expect(hist).toContainText("Entrada por compra");
  await expect(hist).toContainText("Conteo E2E: una unidad dañada");
  await expect(hist).toContainText("Existencias iniciales");
  await hist.getByRole("button", { name: "Cerrar" }).last().click();
  expect((await api(admin).stock())!.onHand).toBe(9);
  await admin.close();
});

test("validaciones del servidor: cantidades enteras, motivo obligatorio y sin conteo repetido", async ({ browser }) => {
  const admin = await as(browser, "admin");
  const mv = (data: unknown) => admin.request.post(`/api/stock/${ids.own}/moves`, { data });
  expect((await mv({ kind: "purchase", qty: 0, unitCost: 1 })).status()).toBe(400);
  expect((await mv({ kind: "purchase", qty: 1.5, unitCost: 1 })).status()).toBe(400);
  expect((await mv({ kind: "adjust", counted: 5, note: "" })).status()).toBe(400);
  expect((await mv({ kind: "adjust", counted: 9, note: "igual que hoy" })).status()).toBe(409); // no_change
  expect((await admin.request.post("/api/stock", { data: { productId: ids.own, onHand: 1, unitCost: 1, minQty: 0 } })).status()).toBe(409); // ya lleva inventario
  expect((await admin.request.post(`/api/stock/${ids.supplier}/moves`, { data: { kind: "purchase", qty: 1, unitCost: 1 } })).status()).toBe(404); // el de Autosolar aún no lleva
  await admin.close();
});

test("descuento por proyecto: al quedar listo sale del inventario, una sola vez, y al desmarcar vuelve", async ({ browser }) => {
  const admin = await as(browser, "admin");
  const a = api(admin);
  expect((await a.source(ids.m1, "stock")).status()).toBe(200);
  expect((await a.stock())!.pending).toBe(2); // pedido por un proyecto en curso, aún sin descontar
  expect((await a.ready(ids.m1, true)).status()).toBe(200);
  expect((await a.stock())!.onHand).toBe(7);
  expect((await a.ready(ids.m1, true)).status()).toBe(200); // repetir no descuenta otra vez
  expect((await a.stock())!.onHand).toBe(7);
  expect((await a.ready(ids.m1, false)).status()).toBe(200);
  expect((await a.stock())!.onHand).toBe(9);
  expect((await a.ready(ids.m1, true)).status()).toBe(200);
  expect((await a.stock())!.onHand).toBe(7);

  // El modo campo marca materiales por otro camino (la cola sin conexión): descuenta igual, y una vez.
  const op = (ready: boolean, id: string) => admin.request.post("/api/field/sync", { data: { ops: [{ id, type: "material", projectId: ids.project, mid: ids.m1, ready, at: new Date().toISOString() }] } });
  expect((await op(false, "op-stock-0001")).status()).toBe(200);
  expect((await a.stock())!.onHand).toBe(9);
  expect((await op(true, "op-stock-0002")).status()).toBe(200);
  expect((await op(true, "op-stock-0003")).status()).toBe(200);
  expect((await a.stock())!.onHand).toBe(7);

  // Un material de un producto que no lleva inventario no puede salir de él.
  expect((await a.source(ids.m2, "stock")).status()).toBe(409);
  // El rol equipo no cambia el origen de un material.
  const eq = await as(browser, "equipo");
  expect([403, 404]).toContain((await eq.request.patch(`/api/projects/${ids.project}/materials/${ids.m1}`, { data: { source: "supplier" } })).status());
  await eq.close();

  // Dejar de llevar inventario con unidades descontadas en un proyecto: bloqueado.
  expect((await admin.request.delete(`/api/stock/${ids.own}`)).status()).toBe(409);
  await admin.close();
});

test("el margen del kit usa el costo promedio (inventario) y el precio del proveedor (Autosolar); el equipo no lo ve", async ({ browser }) => {
  const admin = await as(browser, "admin");
  const m = (await (await admin.request.get(`/api/projects/${ids.project}/margin`)).json()) as { revenue: number; cost: number; margin: number; pct: number; incomplete: boolean; estimated: boolean };
  // 2 × 1.000.000 + 1 × 900.000 de venta; 2 × 700.000 (promedio) + 1 × 700.000 (proveedor) de costo.
  expect(m).toMatchObject({ revenue: 2_900_000, cost: 2_100_000, margin: 800_000, incomplete: false, estimated: false });
  expect(m.pct).toBeCloseTo(27.6, 1);
  await admin.goto(`/es/app/projects/${ids.project}`);
  await expect(admin.getByText("Margen del kit")).toBeVisible();
  await expect(admin.locator(".margin")).toContainText("2.900.000");
  await admin.getByRole("tab", { name: "Materiales" }).click();
  await expect(admin.getByText("Descontado del inventario")).toBeVisible();
  await admin.close();
});

test("la disponibilidad pública suma tus unidades al proveedor: Autosolar agotado pero con inventario propio, se ofrece", async ({ browser, page }) => {
  const admin = await as(browser, "admin");
  const shown = async (q: string) => {
    await page.goto(`/es/products?q=${encodeURIComponent(q)}`);
    return page.locator("article, li").filter({ hasText: q }).first();
  };
  expect(await (await shown("E2E Inversor Autosolar")).textContent()).toContain("Agotado"); // el proveedor no lo tiene y tú tampoco
  expect((await admin.request.post("/api/stock", { data: { productId: ids.supplier, onHand: 3, unitCost: 650000, minQty: 1 } })).status()).toBe(201);
  await expect.poll(async () => (await (await shown("E2E Inversor Autosolar")).textContent()) ?? "").toContain("Disponible");
  // Un producto manual con inventario se agota al llegar a 0 (aunque su casilla «disponible» siga marcada).
  expect((await admin.request.post(`/api/stock/${ids.own}/moves`, { data: { kind: "adjust", counted: 0, note: "E2E: agotado a propósito" } })).status()).toBe(201);
  await expect.poll(async () => (await (await shown(OWN)).textContent()) ?? "").toContain("Agotado");
  expect((await api(admin).stock())!.low).toBe(true);
  await admin.close();
});

test("quitar un producto del inventario pide confirmación y conserva el historial", async ({ browser }) => {
  const admin = await as(browser, "admin");
  // Para poder quitar el de bodega, el material vuelve a «pedir al proveedor» (devuelve lo descontado).
  expect((await api(admin).source(ids.m1, "supplier")).status()).toBe(200);
  await admin.goto("/es/app/stock");
  const row = admin.locator("tr", { hasText: "E2E Inversor Autosolar" });
  await row.getByRole("button", { name: "Quitar" }).click();
  await expect(admin.getByRole("alertdialog")).toContainText("E2E Inversor Autosolar");
  await confirmDialog(admin);
  await expect(row).toHaveCount(0);
  expect((await admin.request.get(`/api/stock/${ids.supplier}/moves`)).status()).toBe(200);
  expect(((await (await admin.request.get(`/api/stock/${ids.supplier}/moves`)).json()) as unknown[]).length).toBeGreaterThan(0);
  await admin.close();
});

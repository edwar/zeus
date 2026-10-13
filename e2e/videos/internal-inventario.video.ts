import { expect, test } from "@playwright/test";
import { startTour } from "./support/tour";
import { renameDemoAdmin, seedDemo } from "../support/db";

// Guía del equipo, sección 11: empezar a llevar inventario de un producto y registrar una compra.
test("video · inventario: empezar y registrar una entrada", async ({ browser }) => {
  seedDemo();
  renameDemoAdmin();
  const tour = await startTour(browser, { role: "admin" });
  const { page } = tour;
  await page.goto("/es/app/stock");
  await expect(page.getByRole("button", { name: "Llevar inventario de un producto" }).first()).toBeVisible();
  tour.begin();

  await tour.say("El inventario es solo de lo que compras para tener en bodega; lo que pides al proveedor no entra aquí");
  await tour.click(page.getByRole("button", { name: "Llevar inventario de un producto" }).first(), 1000);
  await tour.type(page.getByRole("textbox", { name: "Producto" }), "Solarix", "Busca el producto por nombre, referencia o fabricante");
  await tour.click(page.getByRole("button", { name: /Panel solar Solarix 550 W/ }), 1200);
  await tour.type(page.getByLabel("Unidades que tienes hoy"), "10", "Cuántas unidades tienes hoy en bodega");
  await tour.type(page.getByLabel("Costo por unidad (COP)"), "520000", "Lo que te costó a ti cada una, sin tu ganancia: con esto se calcula el margen");
  await tour.type(page.getByLabel("Avisar cuando queden"), "3", "Con esta cantidad o menos aparecerá «Stock bajo»");
  await tour.click(page.getByRole("button", { name: "Empezar a llevar inventario" }), 1200);
  const row = page.locator("tr", { hasText: "Panel solar Solarix 550 W" });
  await expect(row).toBeVisible();

  await tour.say("Cuando llegue una compra nueva, registra la entrada");
  await tour.click(row.getByRole("button", { name: "Registrar entrada" }), 1000);
  await tour.type(page.getByLabel("Unidades que llegaron"), "10", "Cuántas llegaron");
  await tour.type(page.getByLabel("Costo por unidad (COP)"), "560000", "A qué costo: el sistema calcula el costo promedio");
  await expect(page.getByRole("status").filter({ hasText: "Quedarían 20 unidades" })).toBeVisible();
  await tour.say("Antes de guardar ves cómo quedan las existencias y el costo promedio", 3500);
  await tour.click(page.getByRole("button", { name: "Registrar entrada" }).last(), 1200);
  await expect(row.locator("td").nth(1)).toContainText("20");
  await tour.say("Cada entrada y cada salida queda en el historial, y no se puede editar ni borrar");
  await tour.finish("11-inventario");
});

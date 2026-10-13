import { expect, test } from "@playwright/test";
import { startTour } from "./support/tour";
import { cleanupDemo, renameDemoAdmin } from "../support/db";

// Guía del equipo, sección 3: crear un equipo de instalación con su zona.
// El equipo queda activo en Bucaramanga: se borra al terminar para que no cubra las solicitudes de otros videos.
test.afterAll(() => cleanupDemo());

test("video · crear un equipo de instalación", async ({ browser }) => {
  renameDemoAdmin();
  const tour = await startTour(browser, { role: "admin" });
  const { page } = tour;
  await page.goto("/es/app/teams");
  await expect(page.getByRole("heading", { name: "Equipos" })).toBeVisible();
  tour.begin();

  await tour.say("Un equipo es el grupo que hace la visita técnica y la instalación en una zona");
  await page.goto("/es/app/teams/new");
  await expect(page.locator("input[name=name]")).toBeVisible();
  await tour.type(page.locator("input[name=name]"), "Cuadrilla Bucaramanga", "Nombre del equipo");
  await tour.type(page.locator("input[name=contactName]"), "Julián Torres", "Persona de contacto del equipo");
  await tour.type(page.locator("input[type=tel], input[name=phone]").first(), "3115550101", "Su celular: desde aquí se abre WhatsApp");
  await tour.say("Ahora la zona donde trabaja: su ciudad base");
  await tour.type(page.getByPlaceholder(/Bucaramanga/), "Bucaramanga, Santander", "Busca la ciudad base del equipo");
  await tour.click(page.getByRole("button", { name: "Buscar" }), 1500);
  await tour.say("Elige el resultado correcto");
  await tour.click(page.locator(".loc__results button").first(), 1500);
  await tour.type(page.locator("input[name=radiusKm]"), "100", "Hasta cuántos kilómetros se desplaza desde su base");
  await tour.say("Marca a las personas del equipo de instalación que lo integran", 1500);
  await tour.click(page.getByRole("button", { name: /^guardar/i }), 1200);
  await expect(page).not.toHaveURL(/\/teams\/new$/, { timeout: 30_000 });
  await tour.say("Listo: desde ahora las solicitudes de esa zona pueden asignarse a este equipo");
  await tour.finish("03-crear-equipo");
});

import { expect, test } from "@playwright/test";
import { startTour } from "./support/tour";
import { renameDemoAdmin, seedDemo } from "../support/db";

// Guía del equipo, sección 4: el expediente del proyecto: cronograma, avance y materiales.
test("video · proyecto: avance y materiales", async ({ browser }) => {
  seedDemo();
  renameDemoAdmin();
  const tour = await startTour(browser, { role: "admin" });
  const { page } = tour;
  await page.goto("/es/app/projects/e2e-campo-demo");
  await expect(page.getByRole("heading", { name: "Sistema 4 kWp · Girardot" })).toBeVisible();
  tour.begin();

  await tour.say("El expediente del proyecto reúne todo en pestañas");
  await tour.say("Resumen: la etapa, el cliente, el equipo asignado y el avance general");
  await tour.click(page.getByRole("tab", { name: "Cronograma" }), 1200);
  await tour.say("Cronograma: cada barra es un hito con su cuadrilla; la línea marca el día de hoy");
  const progress = page.getByRole("spinbutton", { name: /Estructura y paneles/ });
  await tour.scrollTo(progress);
  await tour.say("Cuando el trabajo avanza, actualiza el porcentaje del hito");
  await tour.type(progress, "100", "Aquí la estructura y los paneles ya quedaron terminados");
  await progress.press("Enter");
  await tour.pause(1800);

  await tour.click(page.getByRole("tab", { name: "Materiales" }), 1200);
  await tour.say("Materiales: la lista sale del kit de la cotización aprobada");
  await tour.say("Marca cada material cuando esté listo en obra");
  await tour.click(page.locator(".check__item", { hasText: "Inversor Solarix 5 kW" }), 1800);
  await tour.say("También puedes marcarlos todos de una vez con «Marcar todos»");
  await tour.say("Si llevas inventario propio, aquí eliges de dónde sale cada material y se descuenta solo");
  await tour.finish("04-avance-materiales");
});

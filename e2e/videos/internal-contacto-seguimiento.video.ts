import { expect, test } from "@playwright/test";
import { startTour } from "./support/tour";
import { renameDemoAdmin } from "../support/db";
import { todayBogota } from "../../src/lib/crm";

// Guía del equipo, sección 8: registrar un contacto con su autorización y dejarle un recordatorio.
const tomorrow = new Date(Date.parse(`${todayBogota()}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

test("video · registrar un contacto y agendar el seguimiento", async ({ browser }) => {
  renameDemoAdmin();
  const tour = await startTour(browser, { role: "admin" });
  const { page } = tour;
  await page.goto("/es/app/leads");
  await page.getByRole("tab", { name: "Contactos" }).click();
  await expect(page.getByRole("button", { name: "Nuevo contacto" })).toBeVisible();
  tour.begin();

  await tour.say("En «Seguimiento» registras a quien aún no pidió cotización: un referido, una llamada, una feria");
  await tour.click(page.getByRole("button", { name: "Nuevo contacto" }), 1000);
  await tour.type(page.getByLabel("Nombre completo"), "Marta Jiménez", "Nombre de la persona");
  await tour.type(page.locator("input[type=tel]"), "3125550142", "Su celular");
  await tour.say("El origen dice cómo llegó: así medimos qué canal funciona mejor");
  await tour.type(page.getByLabel("Primera nota (opcional)"), "Se interesó en la feria; vive en Girardot", "Anota lo que hablaron para no repetirle su historia");
  await tour.set(page.getByLabel("Primer recordatorio (opcional)"), tomorrow, "Agenda cuándo volver a escribirle");
  await tour.say("Es obligatorio que la persona autorice que guardemos sus datos");
  await tour.click(page.getByRole("checkbox", { name: /La persona autorizó/ }), 1200);
  await tour.click(page.getByRole("button", { name: "Guardar contacto" }), 800);
  await page.waitForURL("**/app/leads/*");
  await expect(page.getByRole("heading", { name: "Marta Jiménez" })).toBeVisible();
  await tour.say("Listo: queda en seguimiento, con su nota y su recordatorio para mañana");
  await tour.finish("08-registrar-contacto");
});

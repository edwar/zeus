import { expect, test } from "@playwright/test";
import { startTour } from "./support/tour";
import { demoPhoto } from "./support/image";
import { seedDemo } from "../support/db";

// Guía del equipo, sección 10: el modo campo en el celular, incluso sin señal.
test("video · modo campo en el celular", async ({ browser }) => {
  seedDemo();
  const tour = await startTour(browser, { role: "equipo", mobile: true });
  const { page } = tour;
  await page.goto("/es/app/field");
  await expect(page.getByRole("heading", { level: 1, name: "Modo campo" })).toBeVisible();
  await expect(page.locator(".field__card", { hasText: "Sistema 4 kWp" })).toBeVisible();
  tour.begin();

  await tour.say("Modo campo: la app del celular para trabajar en obra, aunque no haya señal");
  await tour.say("Arriba ves si hay conexión y cuántos cambios faltan por enviar");
  await tour.click(page.locator(".field__card", { hasText: "Sistema 4 kWp" }).getByRole("button", { name: "Abrir" }), 1200);

  const step = (label: string) => page.locator(".field__check", { hasText: label });
  await tour.say("Marca cada paso del checklist cuando lo termines");
  await tour.click(step("Sitio y seguridad verificados").getByRole("checkbox"), 1300);
  await tour.click(step("Estructura de soporte").getByRole("checkbox"), 1300);

  await tour.say("A cualquier paso le puedes agregar una nota");
  await tour.click(step("Estructura de soporte").getByRole("button", { name: "Nota del paso" }), 900);
  await tour.type(step("Estructura de soporte").getByRole("textbox", { name: "Nota del paso" }), "Techo de teja, acceso por escalera");
  await tour.click(step("Estructura de soporte").getByRole("button", { name: "Guardar nota" }), 1200);

  await tour.say("O una foto: se reduce en el teléfono y solo la ve el equipo y la oficina");
  await tour.glide(step("Estructura de soporte").getByLabel(/^Foto/));
  await step("Estructura de soporte").locator("input[type=file]").setInputFiles({ name: "obra.png", mimeType: "image/png", buffer: demoPhoto() });
  await tour.pause(2200);

  await tour.offline(true);
  await tour.say("¿Sin señal? No pasa nada: todo se guarda en el teléfono");
  await expect(page.locator(".field__status")).toContainText("Sin conexión");
  await tour.click(step("Paneles montados").getByRole("checkbox"), 1300);
  await expect(page.locator(".field__status")).toContainText("sin enviar");
  await tour.say("Verás cuántos cambios están «sin enviar» hasta que vuelva la conexión");
  await tour.offline(false);
  await tour.say("Cuando vuelve la señal, se envía solo");
  await expect(page.locator(".field__status")).toContainText("Todo enviado", { timeout: 60_000 });
  await tour.say("Listo: «Todo enviado». Al terminar todos los pasos, el cliente firma el acta en tu celular", 2000);
  await tour.finish("10-modo-campo-movil");
});

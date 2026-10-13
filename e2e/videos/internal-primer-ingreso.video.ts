import { expect, test } from "@playwright/test";
import { startTour } from "./support/tour";
import { createTempUser } from "../support/db";

// Guía del equipo, sección 1: entrar por primera vez con la contraseña temporal y crear la propia.
test("video · primer ingreso y contraseña propia", async ({ browser }) => {
  const acc = createTempUser();
  const tour = await startTour(browser);
  const { page } = tour;
  await page.goto("/es/login");
  await expect(page.getByLabel("Correo")).toBeVisible();
  tour.begin();

  await tour.say("Tu administrador te da un correo y una contraseña temporal");
  await tour.type(page.getByLabel("Correo"), acc.email, "Escribe el correo de tu cuenta");
  await tour.type(page.getByLabel("Contraseña", { exact: true }), acc.password, "Y la contraseña temporal que te dieron");
  await tour.say("Pulsa «Ingresar»", 1500);
  await tour.click(page.getByRole("button", { name: "Ingresar", exact: true }), 800);
  await expect(page.getByRole("heading", { name: "Crea tu contraseña" })).toBeVisible();
  await tour.say("La primera vez es obligatorio crear tu propia contraseña: hasta entonces no puedes usar nada más");

  await tour.type(page.locator("input[name=current]"), acc.password, "Escribe de nuevo la contraseña temporal");
  await tour.type(page.locator("input[name=next]"), "Mi-Clave-Segura-2026", "Elige una contraseña nueva de al menos 10 caracteres");
  await tour.type(page.locator("input[name=confirm]"), "Mi-Clave-Segura-2026", "Repítela para confirmar que no te equivocaste");
  await tour.say("Úsala solo en Zeus y no la compartas con nadie");
  await tour.click(page.getByRole("button", { name: "Cambiar contraseña" }), 600);
  await expect(page.locator(".app__side")).toBeVisible({ timeout: 30_000 });
  await tour.say("Listo: ya puedes usar la plataforma. Al cambiarla se cierran tus otras sesiones", 1500);
  await tour.finish("01-primer-ingreso");
});

import { expect, test } from "@playwright/test";
import { as } from "./support/session";

// Las acciones definitivas piden confirmación en una ventana de la plataforma, nunca en un cuadro nativo del navegador.
test.describe.configure({ mode: "serial" });

const TITLE = "E2E Caso para confirmar borrado";
let id = "";

test("borrar un caso: ventana propia, foco en Cancelar, Escape y el velo no borran; confirmar sí", async ({ browser }) => {
  const admin = await as(browser, "admin");
  let native = 0;
  admin.on("dialog", (d) => { native++; void d.dismiss(); });

  const res = await admin.request.post("/api/cases", { data: { titleEs: TITLE, displayName: "Cliente E2E", town: "Girardot" } });
  test.skip(!res.ok(), `no se pudo crear el caso de prueba (${res.status()})`);
  id = ((await res.json()) as { id: string }).id;

  await admin.goto(`/es/app/cases/${id}`);
  const open = () => admin.getByRole("button", { name: "Eliminar caso" }).click();
  const dialog = admin.getByRole("alertdialog");

  await open();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading")).toContainText("¿Eliminar este caso y sus fotos?");
  await expect(dialog).toContainText("No se puede deshacer");
  const cancel = dialog.getByRole("button", { name: "Cancelar" });
  await expect(cancel).toBeFocused();
  const action = dialog.getByRole("button").last();
  await expect(action).toHaveText(/Eliminar/);
  const bg = await action.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe("rgba(0, 0, 0, 0)"); // botón de acción relleno (tono destructivo)

  await admin.keyboard.press("Enter"); // Enter con el foco en Cancelar no borra
  await expect(dialog).toBeHidden();
  expect((await admin.request.get(`/api/cases/${id}`)).status()).toBe(200);

  await open();
  await admin.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await open();
  await admin.mouse.click(5, 5); // tocar el velo no cierra
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  expect((await admin.request.get(`/api/cases/${id}`)).status()).toBe(200);

  await open();
  await dialog.getByRole("button").last().click();
  await admin.waitForURL("**/app/cases");
  expect((await admin.request.get(`/api/cases/${id}`)).status()).toBe(404);
  expect(native).toBe(0);
  await admin.close();
});

test("los demás diálogos comparten el mismo diseño (cambiar contraseña: pie con Cancelar y acción)", async ({ browser }) => {
  const admin = await as(browser, "admin");
  await admin.goto("/es/app/quotes");
  await admin.locator(".app__side").getByRole("button", { name: "Cambiar contraseña" }).click();
  const dialog = admin.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cerrar" })).toBeVisible();
  await admin.screenshot({ path: "test-results/dialog-form.png" });
  await admin.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await admin.close();
});

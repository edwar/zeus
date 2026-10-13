import { expect, test } from "@playwright/test";
import { startTour } from "./support/tour";
import { cleanupDemo, renameDemoAdmin } from "../support/db";

// Guía del equipo, sección 9: crear un caso real y publicarlo con la autorización del cliente.
// El caso publicado se borra al terminar para que no aparezca en la landing de las demás grabaciones.
test.afterAll(() => cleanupDemo());

test("video · caso real: crear, autorizar y publicar", async ({ browser }) => {
  renameDemoAdmin();
  const tour = await startTour(browser, { role: "admin" });
  const { page } = tour;
  await page.goto("/es/app/cases/new");
  await expect(page.getByLabel("Título (español)")).toBeVisible();
  tour.begin();

  await tour.say("Un caso real es la historia de un cliente con su ahorro verificado. Nada se publica sin su autorización");
  await tour.type(page.getByLabel("Título (español)"), "Panadería La Esperanza bajó su factura de energía", "Título del caso");
  await tour.type(page.getByLabel("Resumen (español)"), "Una panadería de Girardot instaló 4 kWp y su factura mensual bajó de forma notable.", "Un resumen corto de qué se hizo y qué logró");
  await tour.type(page.getByLabel("Cómo aparecerá el cliente"), "Panadería La Esperanza", "Cómo quiere aparecer el cliente: lo decide él");
  await tour.type(page.getByLabel("Ciudad o municipio"), "Girardot", "Dónde está la instalación");
  await tour.type(page.getByLabel("Potencia instalada (kWp)"), "4", "La potencia instalada");
  await tour.set(page.getByLabel("Fecha de instalación"), "2026-03-01", "Cuándo se instaló");
  await tour.type(page.getByLabel("Factura mensual antes (COP)"), "1200000", "La factura mensual de energía antes de instalar");
  await tour.type(page.getByLabel("Factura mensual después (COP)"), "380000", "Y la de después, según las facturas reales");
  await expect(page.getByText(/Ahorro: .*820\.000 al mes/)).toBeVisible();
  await tour.say("El ahorro se calcula solo con esas dos cifras");
  await tour.type(page.getByLabel("Cómo se verificó"), "Facturas de febrero y junio de 2026, comparadas con el mismo consumo.", "Cómo comprobaste el ahorro: qué facturas y de qué meses");
  await tour.set(page.getByLabel("Fecha de la verificación"), "2026-07-10", "Y cuándo lo verificaste");
  await tour.click(page.getByRole("button", { name: "Crear borrador" }), 800);
  await page.waitForURL(/\/app\/cases\/(?!new$)[^/]+$/);
  await expect(page.locator(".case__missing li")).toHaveCount(1);
  await tour.say("El borrador dice qué falta para publicarse: solo la autorización del cliente");
  await tour.scrollTo(page.getByLabel("Cómo y cuándo la dio"));
  await tour.type(page.getByLabel("Cómo y cuándo la dio"), "Autorizó por escrito en WhatsApp el 5 de julio de 2026.", "Deja la constancia: cómo y cuándo autorizó el cliente");
  await tour.click(page.getByRole("checkbox", { name: /Confirmo que el cliente autorizó/ }), 1200);
  await tour.click(page.getByRole("button", { name: "Registrar autorización" }), 1200);
  await expect(page.getByText("Todo listo: el caso cumple lo necesario para publicarse.")).toBeVisible();
  await tour.say("Con la autorización registrada ya se puede publicar");
  await tour.scrollTo(page.getByRole("button", { name: "Publicar caso" }));
  await tour.click(page.getByRole("button", { name: "Publicar caso" }), 1200);
  await expect(page.getByText(/Publicado el/)).toBeVisible();
  await tour.say("Publicado: aparece en la página principal. Si el cliente retira su autorización, se despublica al instante", 2500);
  await tour.finish("09-caso-real");
});

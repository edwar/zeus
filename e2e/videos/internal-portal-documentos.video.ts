import { expect, test } from "@playwright/test";
import { startTour } from "./support/tour";
import { renameDemoAdmin, seedDemo } from "../support/db";

// Guía del equipo, secciones 4 y 7: subir un documento, compartirlo con el cliente y ver su portal.
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

test("video · documentos del proyecto y portal del cliente", async ({ browser }) => {
  seedDemo();
  renameDemoAdmin();
  const tour = await startTour(browser, { role: "admin" });
  const { page } = tour;
  await page.goto("/es/app/projects/e2e-campo-demo");
  await expect(page.getByRole("heading", { name: "Sistema 4 kWp · Girardot" })).toBeVisible();
  tour.begin();

  await tour.say("Los documentos del proyecto (planos, permisos, certificados) viven en su pestaña");
  await tour.click(page.getByRole("tab", { name: "Documentos" }), 1200);
  await tour.say("Son privados: solo el personal los ve, a menos que decidas compartirlos");
  await tour.glide(page.getByLabel("Archivo"));
  await page.getByLabel("Archivo").setInputFiles({ name: "Plano unifilar.pdf", mimeType: "application/pdf", buffer: PDF });
  await tour.say("Elige un PDF o una imagen de hasta 4 MB");
  await tour.type(page.getByLabel("Nombre (opcional)"), "Plano unifilar", "Ponle un nombre claro");
  await tour.click(page.getByRole("checkbox", { name: /Compartirlo con el cliente/ }), 1000);
  await tour.say("Marca esta casilla solo si el cliente debe verlo en su portal");
  await tour.click(page.getByRole("button", { name: "Subir documento" }), 1000);
  await expect(page.locator(".pdocs__row", { hasText: "Plano unifilar" })).toBeVisible();
  await tour.say("Queda en la lista como «Compartido con el cliente»; puedes dejar de compartirlo cuando quieras");

  await tour.scrollTo(page.getByRole("tab", { name: "Resumen" }));
  await tour.click(page.getByRole("tab", { name: "Resumen" }), 1200);
  const open = page.getByRole("link", { name: "Abrir portal" });
  await tour.say("En el Resumen está el portal del cliente: su página privada para seguir el proyecto");
  await tour.scrollTo(open);
  await tour.say("Puedes copiar el enlace, enviarlo por correo o por WhatsApp");
  await tour.glide(open);
  const href = (await open.getAttribute("href"))!;
  await tour.say("Así lo ve el cliente, sin necesidad de crear cuenta");
  await page.goto(href);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Carlos Rodríguez");
  await tour.pause(1500);
  await tour.say("Ve la etapa, el avance y las fechas de cada hito");
  await tour.scrollTo(page.locator("#pt-prod"));
  await tour.say("Un estimado de generación, claramente marcado como estimado");
  await tour.scrollTo(page.locator("#pt-docs"));
  await tour.say("Y sus documentos: la cotización y el plano que compartiste", 2500);
  await tour.finish("07-portal-documentos");
});

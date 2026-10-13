import { expect, test } from "@playwright/test";
import { startTour } from "./support/tour";
import { buildKit, sendQuote } from "../support/simulator";
import { renameDemoAdmin } from "../support/db";

// Guía del equipo, sección 2: atender una solicitud y aprobarla.
const CLIENT = { name: "Ana Gómez", email: "e2e-video-ana@example.com", phone: "3001234567" };

test("video · atender una solicitud y aprobarla", async ({ browser }) => {
  // La solicitud de demostración la crea una «clienta» fuera de cámara.
  const guest = await browser.newPage();
  await buildKit(guest);
  await sendQuote(guest, CLIENT);
  await guest.close();

  renameDemoAdmin(); // el menú y el historial muestran un nombre de persona, no «E2E Admin»
  const tour = await startTour(browser, { role: "admin" });
  const { page } = tour;
  await page.goto("/es/app/quotes");
  await expect(page.getByRole("link", { name: CLIENT.name })).toBeVisible();
  tour.begin();

  await tour.say("Aquí llegan las solicitudes que piden los clientes desde el simulador");
  await tour.say("Abre la solicitud para ver el kit y los datos del cliente");
  await tour.click(page.getByRole("link", { name: CLIENT.name }), 600);
  await page.waitForURL("**/quotes/*");
  await expect(page.getByText(CLIENT.name).first()).toBeVisible();
  await tour.say("Arriba ves los datos del cliente; más abajo, el kit que armó y su precio");
  await tour.scrollTo(page.locator(".flow__actions").first());
  await tour.pause(900);

  const actions = page.locator(".flow__actions button");
  await tour.say("Cuando hables con el cliente, márcala como «Contactada»");
  await tour.click(actions.filter({ hasText: /contactada/i }).first(), 1800);
  await tour.say("Cuando el cliente valide el cálculo, pulsa «Confirmar cálculo»");
  await tour.click(actions.filter({ hasText: /confirm/i }).first(), 1800);
  await tour.say("Aprobar es definitivo: solo cuando el cliente aceptó");
  await tour.click(actions.filter({ hasText: /aprobar/i }).first(), 600);
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await tour.say("Lee el aviso y confirma. El foco empieza en «Cancelar» por seguridad");
  await tour.click(page.getByRole("alertdialog").getByRole("button").last(), 1500);
  await expect(page.locator(".panel__meta").first()).toContainText("Aprobada");
  await tour.say("Listo: la solicitud queda «Aprobada» y todo queda en el historial");
  await tour.finish("02-aprobar-solicitud");
});

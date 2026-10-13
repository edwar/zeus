import { expect, test } from "@playwright/test";
import { startTour } from "./support/tour";
import { quickKit, quickRequest } from "./support/buyer";
import { quoteIdByEmail, releaseQuoteLimit, renameDemoAdmin } from "../support/db";
import { as } from "../support/session";
import { getDict } from "../../src/i18n";

// Guía del comprador, pasos 2 y 4: pedir la cotización y, cuando llega el enlace, revisarla y aceptarla.
const SAY = {
  es: {
    request: ["Ya con tu kit a la vista, pide tu cotización", "Elige el kit que más te guste: puedes ajustar cualquier componente", "Deja tus datos para que tu asesor te contacte", "Autoriza el tratamiento de tus datos: es obligatorio", "Pulsa «Solicitar cotización» y listo", "Recibiste la confirmación: tu asesor te escribirá pronto"],
    open: ["Tu asesor te envía un enlace privado por correo o WhatsApp", "Aquí ves tu cotización: el kit, el precio y la validez del enlace", "Puedes descargarla en PDF para revisarla con calma", "Si todo te cuadra, pulsa «Aceptar cotización»", "Registramos tu respuesta. Aceptar no aprueba todavía: tu asesor confirmará la disponibilidad contigo"],
    name: "Carlos Rodríguez",
  },
  en: {
    request: ["With your kit on screen, request your quote", "Pick the kit you like most: you can adjust any component", "Leave your details so your advisor can contact you", "Authorise the processing of your data: it is required", "Press “Request quote” and you are done", "You get the confirmation: your advisor will write to you soon"],
    open: ["Your advisor sends you a private link by email or WhatsApp", "Here is your quote: the kit, the price and how long the link is valid", "You can download it as a PDF to review it calmly", "If everything looks right, press “Accept quote”", "We record your answer. Accepting does not approve yet: your advisor will confirm availability with you"],
    name: "Carlos Rodriguez",
  },
} as const;

for (const lang of ["es", "en"] as const) {
  test(`video · pedir la cotización (${lang})`, async ({ browser }) => {
    const say = SAY[lang].request;
    const email = `e2e-video-pedir-${lang}@example.com`;
    const tour = await startTour(browser, { lang });
    const { page } = tour;
    await quickKit(page, lang); // relleno: se recorta del video
    await page.locator("input[name=name]").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 0));
    tour.begin();

    await tour.say(say[0]);
    await tour.say(say[1], 1500);
    await tour.scrollTo(page.locator("input[name=name]"));
    await tour.say(say[2], 1200);
    await tour.type(page.locator("input[name=name]"), SAY[lang].name);
    await tour.type(page.locator("input[name=email]"), email);
    await tour.type(page.locator("input[name=phone], input[type=tel]").first(), "3105550177");
    const consent = page.locator("form", { has: page.locator("input[name=name]") }).locator(".wiz__consent input[type=checkbox]");
    await tour.say(say[3], 1500);
    await tour.click(consent, 1200);
    await tour.say(say[4], 1500);
    releaseQuoteLimit();
    await tour.click(page.getByRole("button", { name: /solicitar|request/i }), 800);
    await expect(page.locator(".wiz__done")).toBeVisible({ timeout: 60_000 });
    await tour.say(say[5], 3000);
    await tour.finish(`02-pedir-cotizacion.${lang}`);
  });

  test(`video · revisar y aceptar la cotización (${lang})`, async ({ browser }) => {
    const t = getDict(lang);
    const say = SAY[lang].open;
    const email = `e2e-video-enlace-${lang}@example.com`;
    // Preparación fuera de cámara: una solicitud que el asesor ya confirmó y de la que generó el enlace.
    const guest = await browser.newPage();
    await quickKit(guest, lang);
    await quickRequest(guest, { name: SAY[lang].name, email, phone: "3105550178" });
    await guest.close();
    renameDemoAdmin();
    const admin = await as(browser, "admin");
    const id = quoteIdByEmail(email);
    for (const status of ["contacted", "confirmed"]) expect((await admin.request.patch(`/api/quotes/${id}`, { data: { status } })).ok()).toBe(true);
    const url = ((await (await admin.request.post(`/api/quotes/${id}/share`)).json()) as { url: string }).url;
    await admin.close();

    const tour = await startTour(browser, { lang });
    const { page } = tour;
    await page.goto(new URL(url).pathname);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(SAY[lang].name);
    tour.begin();

    await tour.say(say[0]);
    await tour.say(say[1]);
    await tour.scrollTo(page.getByRole("heading", { name: t.quoteLink.kit }));
    await tour.pause(1500);
    await tour.say(say[2]);
    await tour.glide(page.getByRole("link", { name: t.quoteLink.download }));
    await tour.scrollTo(page.getByRole("button", { name: t.quoteLink.accept }));
    await tour.say(say[3]);
    await tour.click(page.getByRole("button", { name: t.quoteLink.accept }), 800);
    await expect(page.getByText(t.quoteLink.accepted.title)).toBeVisible({ timeout: 30_000 });
    await tour.say(say[4], 4000);
    await tour.finish(`04-aceptar-cotizacion.${lang}`);
  });
}

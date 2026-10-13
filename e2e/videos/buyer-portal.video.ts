import { expect, test } from "@playwright/test";
import { startTour } from "./support/tour";
import { renameDemoAdmin, seedDemo } from "../support/db";
import { as } from "../support/session";

// Guía del comprador, paso 6: tu página privada para seguir el proyecto.
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const SAY = {
  es: ["Esta es tu página privada: la recibes por correo con el botón «Ver mi proyecto»", "Arriba ves la etapa en la que va tu proyecto", "Más abajo, el avance y las fechas de cada paso", "Los materiales: cuántos ya están listos", "Un estimado de lo que producirá tu sistema; la producción real la ves en la app del inversor", "Y tus documentos: la cotización y lo que el equipo comparta contigo"],
  en: ["This is your private page: you get it by email with the “View my project” button", "At the top you see the stage your project is in", "Further down, the progress and the dates of each step", "The materials: how many are already ready", "An estimate of what your system will produce; the real output is in your inverter's app", "And your documents: the quote and whatever the team shares with you"],
} as const;

for (const lang of ["es", "en"] as const) {
  test(`video · seguir tu proyecto (${lang})`, async ({ browser }) => {
    seedDemo();
    renameDemoAdmin();
    const admin = await as(browser, "admin");
    await admin.request.post("/api/projects/e2e-campo-demo/documents", { multipart: { file: { name: "plano.pdf", mimeType: "application/pdf", buffer: PDF }, kind: "plan", title: lang === "es" ? "Plano unifilar" : "Single-line diagram", visibleToClient: "true" } });
    const detail = (await (await admin.request.get("/api/projects/e2e-campo-demo")).json()) as { portal: { url: string } };
    await admin.close();
    const path = new URL(detail.portal.url).pathname.replace(/^\/es\//, `/${lang}/`);

    const tour = await startTour(browser, { lang });
    const { page } = tour;
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Carlos");
    tour.begin();

    const say = SAY[lang];
    await tour.say(say[0]);
    await tour.say(say[1]);
    await tour.scrollTo(page.locator(".track").first());
    await tour.say(say[2], 800);
    await tour.scrollTo(page.locator(".prog__item").first());
    await tour.pause(1200);
    await tour.say(say[3], 800);
    await tour.scrollTo(page.locator("#pt-prod"));
    await tour.say(say[4]);
    await tour.scrollTo(page.locator("#pt-docs"));
    await tour.say(say[5], 2500);
    await tour.finish(`06-seguir-proyecto.${lang}`);
  });
}

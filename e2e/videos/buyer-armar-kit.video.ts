import { expect, test } from "@playwright/test";
import { startTour } from "./support/tour";
import { getDict } from "../../src/i18n";

// Guía del comprador, paso 1: calcular el ahorro y armar el kit en el simulador (sin factura: datos a mano).
const SAY = {
  es: {
    intro: "Calcula tu ahorro en el simulador: toma menos de un minuto",
    manual: "Si no tienes la factura a la mano, puedes escribir tus datos",
    kwh: "Consumo mensual: los kWh que aparecen en tu factura de luz",
    tariff: "Tarifa: lo que pagas por cada kWh (también está en tu factura)",
    place: "Ubicación: dónde se instalaría el sistema, para saber cuánto sol recibe",
    search: "Escribe tu municipio y pulsa «Buscar»",
    pick: "Elige tu ubicación en la lista de resultados",
    calc: "Con tus datos listos, pulsa «Calcular mi kit»",
    done: "Listo: ves tu kit, su precio y cuánto ahorrarías cada mes",
    scroll: "Más abajo hay tres opciones de kit para comparar",
  },
  en: {
    intro: "Work out your savings with the simulator: it takes under a minute",
    manual: "No bill at hand? You can type your numbers in",
    kwh: "Monthly consumption: the kWh shown on your electricity bill",
    tariff: "Tariff: what you pay for each kWh (it is on your bill too)",
    place: "Location: where the system would be installed, so we know how much sun it gets",
    search: "Type your town and press “Search”",
    pick: "Pick your location from the results",
    calc: "With your data ready, press “Calculate my kit”",
    done: "Done: you see your kit, its price and how much you would save each month",
    scroll: "Further down there are three kit options to compare",
  },
} as const;

for (const lang of ["es", "en"] as const) {
  test(`video · armar tu kit (${lang})`, async ({ browser }) => {
    const t = getDict(lang);
    const say = SAY[lang];
    const tour = await startTour(browser, { lang });
    const { page } = tour;
    await page.goto(`/${lang}/simulator`);
    const manual = page.getByRole("button", { name: t.wiz.upload.manual });
    await expect(manual).toBeVisible();
    tour.begin();

    await tour.say(say.intro);
    await tour.say(say.manual, 1500);
    // Un clic antes de que React hidrate la página no hace nada: se reintenta hasta que aparezca el formulario.
    await tour.glide(manual);
    await expect(async () => {
      await manual.click({ timeout: 4_000 });
      await expect(page.getByLabel(t.wiz.review.monthlyKwh)).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 60_000 });
    await tour.pause(1500);

    await tour.type(page.getByLabel(t.wiz.review.monthlyKwh), "300", say.kwh);
    await tour.type(page.getByLabel(t.wiz.review.tariff), "900", say.tariff);
    await tour.say(say.place);
    await tour.type(page.getByPlaceholder(t.wiz.review.location.placeholder), "Bucaramanga, Santander", say.search);
    await tour.click(page.getByRole("button", { name: t.wiz.review.location.find, exact: true }), 1600);
    await tour.say(say.pick, 1800);
    await tour.click(page.locator(".loc__results button").first(), 1500);
    await tour.say(say.calc, 1800);
    await tour.click(page.getByRole("button", { name: t.wiz.review.next }), 800);
    await expect(page.locator(".wiz__total")).toBeVisible({ timeout: 60_000 });
    await tour.say(say.done);
    await tour.say(say.scroll, 1200);
    await tour.scrollTo(page.locator(".wiz__total"));
    await tour.pause(2800);
    await tour.finish(`01-armar-kit.${lang}`);
  });
}

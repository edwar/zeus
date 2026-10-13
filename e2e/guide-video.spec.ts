import { expect, test } from "@playwright/test";
import { as } from "./support/session";

// Videos de apoyo en las guías: la del equipo (solo con sesión) y la del comprador (pública).
const VIDEO = "/api/guide/video/02-aprobar-solicitud";

test("los videos de la guía del equipo exigen sesión, aceptan rangos y solo sirven archivos de su carpeta", async ({ browser, request }) => {
  expect((await request.get(`${VIDEO}.webm`)).status()).toBe(401);
  const eq = await as(browser, "equipo"); // la guía es para todo el personal
  const full = await eq.request.get(`${VIDEO}.webm`);
  expect(full.status()).toBe(200);
  expect(full.headers()["content-type"]).toBe("video/webm");
  expect(full.headers()["accept-ranges"]).toBe("bytes");
  expect(full.headers()["cache-control"]).toMatch(/^private/);
  const size = (await full.body()).length;
  expect(size).toBeGreaterThan(10_000);
  expect(size).toBeLessThan(1_500_000); // liviano: es el punto de comprimirlos

  const part = await eq.request.get(`${VIDEO}.webm`, { headers: { Range: "bytes=0-99" } });
  expect(part.status()).toBe(206);
  expect(part.headers()["content-range"]).toBe(`bytes 0-99/${size}`);
  expect((await part.body()).length).toBe(100);
  expect((await eq.request.get(`${VIDEO}.webm`, { headers: { Range: `bytes=${size + 10}-` } })).status()).toBe(416);

  expect((await eq.request.get(`${VIDEO}.jpg`)).headers()["content-type"]).toBe("image/jpeg");
  for (const bad of ["..%2F..%2F.env", "..%2Fnext.config.ts", "02-aprobar-solicitud.exe", "no-existe.webm", "02-aprobar-solicitud.WEBM"]) {
    expect((await eq.request.get(`/api/guide/video/${bad}`)).status(), bad).toBe(404);
  }
  await eq.close();
});

test("la guía del equipo muestra el video en su sección, sin descargarlo hasta pulsar play", async ({ browser }) => {
  const admin = await as(browser, "admin");
  const downloads: string[] = [];
  admin.on("request", (r) => { if (/\.(webm|mp4)(\?|$)/.test(r.url())) downloads.push(r.url()); });
  await admin.goto("/es/app/guide/02-solicitudes-y-cotizacion");
  const fig = admin.locator(".guidedoc__body .gvideo");
  await expect(fig).toBeVisible();
  const video = fig.locator("video");
  await expect(video).toHaveAttribute("preload", "none");
  await expect(video).toHaveAttribute("poster", `${VIDEO}.jpg`);
  await expect(video).toHaveAttribute("aria-label", /atender una solicitud y aprobarla/i);
  await expect(video.locator("source")).toHaveCount(2);
  await expect(fig.locator("figcaption")).toContainText("1 minuto");
  expect(await admin.locator(".guidedoc__body p figure").count()).toBe(0); // una figura no va dentro de un <p>
  await admin.waitForTimeout(1500);
  expect(downloads).toEqual([]);
  await admin.close();
});

for (const lang of ["es", "en"] as const) {
  test(`la guía del comprador (${lang}) trae su video con póster y sin descargarlo antes de tiempo`, async ({ page }) => {
    const downloads: string[] = [];
    page.on("request", (r) => { if (/\.(webm|mp4)(\?|$)/.test(r.url())) downloads.push(r.url()); });
    await page.goto(`/${lang}`);
    const videos = page.locator("#guia .gvideo video");
    await expect(videos).toHaveCount(4);
    for (const file of ["01-armar-kit", "02-pedir-cotizacion", "04-aceptar-cotizacion", "06-seguir-proyecto"]) {
      const video = page.locator(`#guia video[poster="/guia/${file}.${lang}.jpg"]`);
      await expect(video, file).toHaveCount(1);
      await expect(video).toHaveAttribute("preload", "none");
      const webm = await page.request.get(`/guia/${file}.${lang}.webm`);
      expect(webm.status(), file).toBe(200);
      expect((await webm.body()).length, file).toBeLessThan(2_000_000); // livianos
      expect((await page.request.get(`/guia/${file}.${lang}.jpg`)).status(), file).toBe(200);
    }
    await videos.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    expect(downloads.filter((u) => !u.includes("request"))).toEqual([]);
  });
}

test("el video de la guía del equipo se reproduce de verdad al pulsar play", async ({ browser }) => {
  const admin = await as(browser, "admin");
  await admin.goto("/es/app/guide/02-solicitudes-y-cotizacion");
  const video = admin.locator(".guidedoc__body .gvideo video");
  await video.scrollIntoViewIfNeeded();
  await video.evaluate((v: HTMLVideoElement) => { v.muted = true; return v.play(); });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 15_000 }).toBeGreaterThan(0.5);
  expect(await video.evaluate((v: HTMLVideoElement) => ({ w: v.videoWidth, h: v.videoHeight, err: v.error?.code ?? null }))).toEqual({ w: 1024, h: 576, err: null });
  await admin.close();
});

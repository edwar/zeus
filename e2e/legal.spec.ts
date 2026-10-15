import { expect, test } from "@playwright/test";
import { pendingFields } from "../src/lib/legal/config";
import { PASSWORD, USERS } from "./support/env";
import { buildKit } from "./support/simulator";

const pending = pendingFields();

test.describe("políticas de privacidad y seguridad", () => {
  for (const [lang, privacyTitle, securityTitle, termsTitle] of [
    ["es", "Política de privacidad y tratamiento de datos personales", "Seguridad", "Términos y condiciones de la cotización y la venta"],
    ["en", "Privacy and personal data processing policy", "Security", "Terms and conditions for quotes and sales"],
  ] as const) {
    test(`las páginas existen en ${lang}, con título y tabla de contenido`, async ({ page }) => {
      for (const [path, title] of [["privacy", privacyTitle], ["security", securityTitle], ["terms", termsTitle]] as const) {
        const res = await page.goto(`/${lang}/${path}`);
        expect(res?.status(), path).toBe(200);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
        const links = page.locator(".legal__side a");
        expect(await links.count()).toBeGreaterThanOrEqual(6);
        // La tabla de contenido lleva a cada sección.
        await links.nth(2).click();
        await expect(page).toHaveURL(/#[a-z-]+$/);
      }
    });
  }

  test("los datos sin completar se ven resaltados y desaparecen cuando se completan", async ({ page }) => {
    await page.goto("/es/privacy");
    const marked = await page.locator(".legal__pending").count();
    expect(marked > 0).toBe(pending.length > 0);
    // Sin datos pendientes no debe quedar ningún marcador en el texto.
    if (pending.length === 0) await expect(page.locator("body")).not.toContainText("POR COMPLETAR");
  });

  test("el pie de página enlaza a las dos políticas", async ({ page }) => {
    await page.goto("/es");
    const nav = page.getByRole("navigation", { name: "Información legal" });
    await expect(nav.getByRole("link", { name: "Privacidad y datos personales" })).toHaveAttribute("href", "/es/privacy");
    await expect(nav.getByRole("link", { name: "Términos y condiciones" })).toHaveAttribute("href", "/es/terms");
    await nav.getByRole("link", { name: "Seguridad" }).click();
    await expect(page).toHaveURL(/\/es\/security$/);
  });

  test("la autorización y el aviso de la factura enlazan a la política, en otra pestaña", async ({ page }) => {
    await page.goto("/es/simulator");
    const note = page.locator(".wiz__privacy a");
    await expect(note).toHaveAttribute("href", "/es/privacy");
    await expect(note).toHaveAttribute("target", "_blank");
    await expect(page.locator(".wiz__privacy")).toContainText("servicio de lectura con IA");

    await buildKit(page);
    // Dos autorizaciones en el kit: la de la solicitud y la de «Guarda tu cálculo». Ambas enlazan a la política y son obligatorias.
    const consents = page.locator(".wiz__consent");
    await expect(consents).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      const consent = consents.nth(i).locator("a");
      await expect(consent).toHaveAttribute("href", "/es/privacy");
      await expect(consent).toHaveAttribute("target", "_blank");
      await expect(consent).toHaveAttribute("rel", /noopener/);
      await expect(consents.nth(i).locator("input")).toHaveAttribute("required", "");
    }
  });

  test("security.txt: se publica solo con un correo real y cumple RFC 9116", async ({ request }) => {
    const res = await request.get("/.well-known/security.txt");
    if (pending.includes("security.email")) {
      expect(res.status()).toBe(404); // nunca un marcador de posición como contacto
      return;
    }
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    const body = await res.text();
    expect(body).toMatch(/^Contact: mailto:.+@.+$/m);
    expect(body).toMatch(/^Expires: \d{4}-\d{2}-\d{2}T/m);
  });

  test("el mapa del sitio incluye las políticas en ambos idiomas", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    for (const url of ["/es/privacy", "/en/privacy", "/es/security", "/en/security", "/es/terms", "/en/terms"]) expect(xml).toContain(url);
  });

  // Lo que dice la política de seguridad sobre la cookie de sesión tiene que ser cierto.
  test("la cookie de sesión es HttpOnly y SameSite", async ({ request, baseURL }) => {
    const res = await request.post("/api/auth/sign-in/email", { data: { email: USERS.admin.email, password: PASSWORD }, headers: { origin: baseURL! } });
    expect(res.ok()).toBe(true);
    const cookie = res.headersArray().filter((h) => h.name.toLowerCase() === "set-cookie").map((h) => h.value).find((v) => /session_token/.test(v));
    expect(cookie, "no llegó la cookie de sesión").toBeTruthy();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  test("las cabeceras de seguridad que promete la política están presentes", async ({ request }) => {
    const h = (await request.get("/es")).headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["strict-transport-security"]).toMatch(/max-age=63072000/);
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBeTruthy();
  });
});

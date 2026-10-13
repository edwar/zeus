import { expect, test, type Page } from "@playwright/test";
import { createResetToken, createTempUser } from "./support/db";
import { as } from "./support/session";

// Contraseña temporal → cambio obligatorio → restablecer por correo (token) → restablecer por un admin.
// Una sola cuenta recorre los pasos en orden, por eso la serie.
test.describe.configure({ mode: "serial" });

const NEW1 = "Nueva-Clave-12345";
const NEW2 = "Otra-Clave-67890";
const TEMP2 = "Temporal-Admin-1234";

let account: { name: string; email: string; password: string };

/** Inicia sesión por API (la cookie queda en el contexto). El login admite 5 intentos por minuto: ante un 429 se espera lo que indique el servidor. */
async function signIn(page: Page, email: string, password: string): Promise<number> {
  const origin = new URL(page.url() === "about:blank" ? "http://localhost:3000" : page.url()).origin;
  for (let i = 0; i < 6; i++) {
    const res = await page.request.post("/api/auth/sign-in/email", { data: { email, password }, headers: { origin }, timeout: 90_000 });
    if (res.status() !== 429) return res.status();
    await new Promise((r) => setTimeout(r, ((Number(res.headers()["x-retry-after"]) || 10) + 1) * 1000));
  }
  throw new Error("El límite de intentos no se liberó (429).");
}

async function login(page: Page, email: string, password: string) {
  expect(await signIn(page, email, password)).toBe(200);
  await page.goto("/es/app/projects");
}

test.describe("contraseña", () => {
  test.beforeAll(() => { account = createTempUser(); });

  test("el inicio de sesión enlaza a «olvidaste tu contraseña»", async ({ page }) => {
    await page.goto("/es/login");
    await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
    await expect(page).toHaveURL(/\/es\/forgot-password$/);
    await expect(page.getByRole("heading", { name: "Recupera tu contraseña" })).toBeVisible();
    // Sin correo configurado se explica qué hacer; con correo configurado hay formulario. Nunca una página vacía.
    await expect(page.locator("input[type=email], .auth__sub").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Ir a ingresar" })).toBeVisible();
  });

  test("un enlace de restablecimiento inválido lo explica y ofrece pedir otro", async ({ page }) => {
    await page.goto("/es/reset-password?error=INVALID_TOKEN");
    await expect(page.getByRole("alert").filter({ hasText: /no es válido o ya venció/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pedir un enlace nuevo" })).toBeVisible();
  });

  test("con contraseña temporal solo se ve el cambio obligatorio y las APIs responden 403", async ({ page }) => {
    await login(page, account.email, account.password);
    await expect(page.getByRole("heading", { name: "Crea tu contraseña" })).toBeVisible();
    await expect(page.locator(".app__side")).toHaveCount(0);
    const res = await page.request.get("/api/projects");
    expect(res.status()).toBe(403);
    expect(await res.json()).toEqual({ error: "PasswordChangeRequired" });
  });

  test("valida la contraseña actual, la longitud y la confirmación; luego entra", async ({ page }) => {
    await login(page, account.email, account.password);
    const fill = async (cur: string, next: string, conf: string) => {
      await page.locator("input[name=current]").fill(cur);
      await page.locator("input[name=next]").fill(next);
      await page.locator("input[name=confirm]").fill(conf);
      await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    };
    await fill(account.password, NEW1, "otra-distinta-123");
    await expect(page.getByRole("alert").filter({ hasText: "no coinciden" })).toBeVisible();
    await fill("clave-actual-incorrecta", NEW1, NEW1);
    await expect(page.getByRole("alert").filter({ hasText: "contraseña actual no es correcta" })).toBeVisible();
    await fill(account.password, NEW1, NEW1);
    await expect(page.getByRole("heading", { name: "Crea tu contraseña" })).toHaveCount(0);
    await expect(page.locator(".app__side")).toBeVisible();
    // La temporal ya no sirve y la nueva sí.
    expect(await signIn(page, account.email, account.password)).toBe(401);
  });

  test("desde el panel se puede cambiar la propia contraseña", async ({ page }) => {
    await login(page, account.email, NEW1);
    await page.waitForURL(/\/app\/projects/); // /app redirige según el rol; hay que esperar a que termine antes de abrir el diálogo
    // En móvil la barra superior lleva el idioma y el menú de cuenta: no debe desbordar la pantalla.
    await page.setViewportSize({ width: 375, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator(".app__top").getByRole("button", { name: "Mi cuenta" }).click();
    await page.getByRole("menuitem", { name: "Cambiar contraseña" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("input[name=current]").fill(NEW1);
    await dialog.locator("input[name=next]").fill(NEW2);
    await dialog.locator("input[name=confirm]").fill(NEW2);
    await dialog.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(dialog.getByRole("status").filter({ hasText: "Contraseña cambiada" })).toBeVisible();
    await expect(dialog).toBeHidden(); // se cierra solo tras confirmar
  });

  test("el enlace del correo (token) permite crear una contraseña nueva, una sola vez", async ({ page }) => {
    const token = createResetToken();
    await page.goto(`/es/reset-password?token=${token}`);
    await page.locator("input[name=next]").fill(NEW1);
    await page.locator("input[name=confirm]").fill(NEW1);
    await page.getByRole("button", { name: "Guardar contraseña" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Ya puedes ingresar" })).toBeVisible();
    // El token se consumió: usarlo otra vez falla.
    await page.goto(`/es/reset-password?token=${token}`);
    await page.locator("input[name=next]").fill(NEW2);
    await page.locator("input[name=confirm]").fill(NEW2);
    await page.getByRole("button", { name: "Guardar contraseña" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /no es válido o ya venció/i })).toBeVisible();
    await login(page, account.email, NEW1);
    await expect(page).toHaveURL(/\/app/);
  });

  test("un admin restablece la contraseña de otra cuenta y esa persona debe cambiarla", async ({ browser, page }) => {
    const admin = await as(browser, "admin");
    await admin.goto("/es/app/users");
    await admin.getByRole("button", { name: `Restablecer contraseña: ${account.name}` }).click();
    const dialog = admin.getByRole("dialog");
    await dialog.locator("input[name=password]").fill(TEMP2);
    await dialog.getByRole("button", { name: "Restablecer", exact: true }).click();
    await expect(admin.getByRole("status").filter({ hasText: "Contraseña restablecida" })).toBeAttached();
    // Una administradora no puede restablecerse a sí misma desde aquí.
    await expect(admin.getByRole("button", { name: /Restablecer contraseña: E2E Admin/ })).toBeDisabled();
    await admin.close();

    expect(await signIn(page, account.email, NEW1)).toBe(401);
    await login(page, account.email, TEMP2);
    await expect(page.getByRole("heading", { name: "Crea tu contraseña" })).toBeVisible();
  });
});

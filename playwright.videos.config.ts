import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

// Videos cortos para las guías (la del equipo y la del comprador). Cada guion hace los pasos en pantalla con datos de demostración
// y Playwright graba el video; `pnpm videos` los graba y los comprime. Corre contra la versión compilada (sin la barra de desarrollo de
// Next) y escribe en la base de DATABASE_URL como las pruebas e2e: solo local, y se limpia al terminar.
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
process.env.E2E_BASE_URL = baseURL; // el setup global inicia sesión contra este servidor

export default defineConfig({
  testDir: "./e2e/videos",
  testMatch: /\.video\.ts$/,
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 240_000,
  expect: { timeout: 30_000 },
  retries: 0,
  reporter: [["list"]],
  use: { baseURL, screenshot: "only-on-failure", locale: "es-CO", actionTimeout: 30_000, navigationTimeout: 90_000, ...devices["Desktop Chrome"], viewport: { width: 1024, height: 576 } },
  webServer: {
    command: `NEXT_DIST_DIR=.next-e2e NEXT_PUBLIC_SITE_URL=${baseURL} pnpm build && NEXT_DIST_DIR=.next-e2e pnpm start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 360_000,
    env: { BETTER_AUTH_URL: baseURL, NEXT_PUBLIC_SITE_URL: baseURL },
  },
});

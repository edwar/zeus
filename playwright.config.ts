import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

// Pruebas de extremo a extremo. Escriben datos reales (usuarios, equipo, solicitudes) en la base de DATABASE_URL y los
// borran al terminar, así que solo corren contra un servidor local (ver e2e/support/env.ts).
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// El service worker del modo campo solo se registra en producción: su prueba (recargar la página sin red) corre contra una versión
// compilada, en otro puerto y otro directorio. Ese servidor solo se levanta si la corrida incluye esa prueba (o si no se filtró ninguna).
const PROD_PORT = 3100;
const prodURL = `http://localhost:${PROD_PORT}`;
const specs = process.argv.slice(2).filter((a) => /\.spec\.ts$/.test(a));
const wantsOffline = specs.length === 0 || specs.some((a) => a.includes("field-offline"));

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  // Los flujos comparten estado (equipo → solicitud → proyecto): un solo worker y en orden.
  workers: 1,
  fullyParallel: false,
  // `next dev` compila cada ruta la primera vez que se visita; los tiempos tienen margen para eso.
  timeout: 120_000,
  expect: { timeout: 20_000 },
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "es-CO",
    viewport: { width: 1280, height: 900 },
    actionTimeout: 30_000,
    navigationTimeout: 90_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", testIgnore: /field-offline\.spec\.ts/, use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "offline", testMatch: /field-offline\.spec\.ts/, use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 }, baseURL: prodURL, serviceWorkers: "allow" } },
  ],
  webServer: [
    // Si ya tienes `pnpm dev` corriendo en el puerto, lo reutiliza; si no, lo levanta.
    { command: "pnpm dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
    ...(wantsOffline
      ? [{
          // Versión de producción para probar el service worker. NEXT_PUBLIC_SITE_URL se fija al compilar (orígenes de confianza del login).
          command: `NEXT_DIST_DIR=.next-e2e NEXT_PUBLIC_SITE_URL=${prodURL} pnpm build && NEXT_DIST_DIR=.next-e2e pnpm start -p ${PROD_PORT}`,
          url: prodURL,
          reuseExistingServer: true,
          timeout: 360_000,
          env: { BETTER_AUTH_URL: prodURL, NEXT_PUBLIC_SITE_URL: prodURL },
        }]
      : []),
  ],
});

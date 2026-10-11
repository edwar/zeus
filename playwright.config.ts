import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

// Pruebas de extremo a extremo. Escriben datos reales (usuarios, equipo, solicitudes) en la base de DATABASE_URL y los
// borran al terminar, así que solo corren contra un servidor local (ver e2e/support/env.ts).
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

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
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } }],
  // Si ya tienes `pnpm dev` corriendo en el puerto, lo reutiliza; si no, lo levanta.
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

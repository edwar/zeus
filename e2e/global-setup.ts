import { request } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { cleanup, createUsers } from "./support/db";
import { BASE_URL, PASSWORD, USERS, assertLocal, authFile, type RoleKey } from "./support/env";

/** Inicia sesión por API. El login tiene límite de intentos persistido en la base: ante un 429 se espera lo que indique el servidor. */
async function signIn(role: RoleKey) {
  const ctx = await request.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { origin: BASE_URL } });
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await ctx.post("/api/auth/sign-in/email", { data: { email: USERS[role].email, password: PASSWORD }, timeout: 90_000 });
    if (res.ok()) {
      await ctx.storageState({ path: authFile(role) });
      await ctx.dispose();
      return;
    }
    if (res.status() !== 429) throw new Error(`No se pudo iniciar sesión como ${role}: ${res.status()}`);
    const wait = Number(res.headers()["x-retry-after"] ?? res.headers()["retry-after"]) || 10;
    await new Promise((r) => setTimeout(r, (wait + 1) * 1000));
  }
  throw new Error(`Login de ${role}: el límite de intentos no se liberó (429).`);
}

// Crea un usuario por rol y guarda su sesión, para que cada prueba arranque ya autenticada con el rol que necesita.
export default async function globalSetup() {
  assertLocal();
  cleanup(); // por si una corrida anterior se cortó a la mitad
  try {
    createUsers();
    mkdirSync("e2e/.auth", { recursive: true });
    for (const role of Object.keys(USERS) as RoleKey[]) await signIn(role);
  } catch (e) {
    // Si el setup falla, Playwright no ejecuta el teardown: se limpia aquí para no dejar usuarios de prueba.
    cleanup();
    throw e;
  }
}

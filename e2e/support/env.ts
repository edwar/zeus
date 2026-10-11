// Las pruebas crean y borran datos reales: no se permite apuntarlas a un sitio publicado.
export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export function assertLocal() {
  const host = new URL(BASE_URL).hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host) && process.env.E2E_ALLOW_REMOTE !== "1") {
    throw new Error(`E2E_BASE_URL=${BASE_URL} no es local. Estas pruebas escriben en la base de datos; no se ejecutan contra otros entornos.`);
  }
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL (se lee de .env).");
}

/** Datos de prueba: todo lleva el prefijo "e2e" / "E2E" para poder borrarlo sin tocar nada más. */
export const PASSWORD = "E2e-Prueba-12345";
export const USERS = {
  admin: { name: "E2E Admin", email: "e2e-admin@example.com", role: "admin" },
  gestion: { name: "E2E Gestor", email: "e2e-gestion@example.com", role: "gestion" },
  equipo: { name: "E2E Instalador", email: "e2e-equipo@example.com", role: "equipo" },
} as const;
export type RoleKey = keyof typeof USERS;

export const TEAM_NAME = "E2E Equipo";
export const CLIENTS = {
  kitOnly: { name: "E2E Solo kit", email: "e2e-kit@example.com", phone: "3001112233" },
  install: { name: "E2E Instalacion", email: "e2e-install@example.com", phone: "3009998877" },
} as const;

export const authFile = (role: RoleKey) => `e2e/.auth/${role}.json`;

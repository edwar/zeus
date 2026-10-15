// Las pruebas crean y borran datos reales: no se permite apuntarlas a un sitio publicado.
export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export function assertLocal() {
  const host = new URL(BASE_URL).hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host) && process.env.E2E_ALLOW_REMOTE !== "1") {
    throw new Error(`E2E_BASE_URL=${BASE_URL} no es local. Estas pruebas escriben en la base de datos; no se ejecutan contra otros entornos.`);
  }
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL (se lee de .env).");
  // Las pruebas disparan avisos por correo (al cliente y al equipo): con Resend configurado saldrían correos de verdad.
  if (process.env.RESEND_API_KEY && process.env.MAIL_FROM && process.env.E2E_ALLOW_MAIL !== "1") {
    throw new Error("RESEND_API_KEY y MAIL_FROM están definidos: las pruebas E2E enviarían correos reales. Quítalos del .env local para correrlas (o usa E2E_ALLOW_MAIL=1 si es a propósito).");
  }
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
  link: { name: "E2E Enlace", email: "e2e-enlace@example.com", phone: "3004445566" },
  crm: { name: "E2E Seguimiento", email: "e2e-seguimiento@example.com", phone: "3007778899" },
  saved: { name: "E2E Guardado", email: "e2e-guardado@example.com", phone: "3001234567" },
  plain: { name: "E2E Directo", email: "e2e-directo@example.com", phone: "3002223344" },
  privacy: { name: "E2E Privacidad", email: "e2e-privacidad@example.com", phone: "3005550101" },
  referral: { name: "E2E Referido", email: "e2e-referido@example.com", phone: "3006665544" },
} as const;

export const authFile = (role: RoleKey) => `e2e/.auth/${role}.json`;

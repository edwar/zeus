// Se ejecuta con `node --import tsx` (ver db.ts): el cliente de Prisma generado es ESM y Playwright carga TS como CJS.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { auth } from "../../src/lib/auth";
import { PASSWORD, USERS } from "./env";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const E2E_EMAIL = { startsWith: "e2e-", endsWith: "@example.com" } as const;

/** Borra solo lo que crean estas pruebas: solicitudes y usuarios "e2e-…@example.com" y el equipo "E2E …". */
async function cleanup() {
  const quotes = await prisma.quoteRequest.findMany({ where: { contactEmail: E2E_EMAIL }, select: { id: true } });
  // Project.quoteId es SetNull al borrar la solicitud: el proyecto se borra antes por su solicitud de origen.
  await prisma.project.deleteMany({ where: { quoteId: { in: quotes.map((q) => q.id) } } });
  await prisma.quoteRequest.deleteMany({ where: { id: { in: quotes.map((q) => q.id) } } });
  await prisma.team.deleteMany({ where: { name: { startsWith: "E2E " } } });
  await prisma.verification.deleteMany({ where: { identifier: { startsWith: "reset-password:e2e-reset-" } } });
  // Los límites de intentos de cambio/restablecimiento se guardan en la base: se reinician para que la serie se pueda repetir.
  await prisma.rateLimit.deleteMany({ where: { OR: ["/change-password", "/request-password-reset", "/reset-password"].map((path) => ({ key: { endsWith: path } })) } });
  await prisma.user.deleteMany({ where: { email: E2E_EMAIL } });
}

async function createUsers() {
  for (const u of Object.values(USERS)) {
    await auth.api.createUser({ body: { email: u.email, password: PASSWORD, name: u.name, role: u.role } });
  }
  // Toda cuenta que crea un admin nace con contraseña temporal; las de prueba ya entran a la plataforma.
  await prisma.user.updateMany({ where: { email: { in: Object.values(USERS).map((u) => u.email) } }, data: { mustChangePassword: false } });
}

const TEMP_USER = { name: "E2E Temporal", email: "e2e-temp@example.com" };
const TEMP_PASSWORD = "E2e-Temporal-12345";

/** Cuenta con contraseña temporal (la marca la pone el hook de creación). Imprime su correo y contraseña. */
async function createTempUser() {
  await auth.api.createUser({ body: { ...TEMP_USER, password: TEMP_PASSWORD, role: "equipo" } });
  console.log(JSON.stringify({ ...TEMP_USER, password: TEMP_PASSWORD }));
}

/** Token de restablecimiento válido para la cuenta temporal de prueba (equivale al del correo). Imprime el token. */
async function createResetToken() {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: TEMP_USER.email } });
  const token = `e2e-reset-${Date.now()}`;
  await prisma.verification.create({ data: { id: token, identifier: `reset-password:${token}`, value: user.id, expiresAt: new Date(Date.now() + 10 * 60_000) } });
  console.log(token);
}



const BULK_QUOTES = 230; // más que el antiguo tope de 200 de la API
const BULK_PROJECTS = 60;
const pad = (n: number) => String(n).padStart(3, "0");

/** Muchas solicitudes y proyectos de prueba para probar la paginación (la 001 es la más antigua). */
async function seedBulk() {
  const statuses = ["new", "contacted", "confirmed", "approved", "discarded"] as const;
  const stages = ["lead", "visit", "design", "install", "monitor"] as const;
  const now = Date.now();
  await prisma.quoteRequest.createMany({
    data: Array.from({ length: BULK_QUOTES }, (_, k) => {
      const n = k + 1;
      return {
        id: `e2e-bulkq-${pad(n)}`,
        status: statuses[k % statuses.length],
        contactName: `E2E Bulk ${pad(n)}`,
        contactEmail: `e2e-bulk-${pad(n)}@example.com`,
        contactPhone: "3001112233",
        city: "Bucaramanga",
        systemType: "ongrid",
        bill: { monthlyKwh: 300, coveragePct: 100, peakSunHours: 4.5 },
        sizing: { kwp: 3, monthlySolarKwh: 300, monthlySavings: null, batteryNominalKwh: 0 },
        total: 1_000_000 + n,
        consentAt: new Date(now),
        ipHash: "e2e",
        createdAt: new Date(now - (BULK_QUOTES - n) * 60_000),
      };
    }),
  });
  await prisma.project.createMany({
    data: Array.from({ length: BULK_PROJECTS }, (_, k) => {
      const n = k + 1;
      return {
        id: `e2e-bulkp-${pad(n)}`,
        name: `Sistema E2E ${pad(n)}`,
        client: `E2E Bulk ${pad(n)}`,
        town: "Bucaramanga",
        kwp: 3,
        stage: stages[k % stages.length],
        owner: "E2E Admin",
        due: new Date(now + 30 * 86_400_000),
        progress: 0,
        quoteId: `e2e-bulkq-${pad(n)}`,
      };
    }),
  });
}

/** Borra solo lo sembrado por seedBulk. */
async function cleanupBulk() {
  await prisma.project.deleteMany({ where: { id: { startsWith: "e2e-bulkp-" } } });
  await prisma.quoteRequest.deleteMany({ where: { id: { startsWith: "e2e-bulkq-" } } });
}

const actions = { cleanup, createUsers, createTempUser, createResetToken, seedBulk, cleanupBulk } as const;
const action = process.argv[2] as keyof typeof actions;
if (!actions[action]) {
  console.error(`Acción desconocida: ${action}`);
  process.exit(1);
}
actions[action]()
  .catch((e) => {
    console.error(e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit();
  });

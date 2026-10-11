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
  await prisma.user.deleteMany({ where: { email: E2E_EMAIL } });
}

async function createUsers() {
  for (const u of Object.values(USERS)) {
    await auth.api.createUser({ body: { email: u.email, password: PASSWORD, name: u.name, role: u.role } });
  }
}



const actions = { cleanup, createUsers } as const;
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

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
  // Contactos del seguimiento (CRM): sus notas y recordatorios se borran en cascada.
  await prisma.lead.deleteMany({ where: { OR: [{ name: { startsWith: "E2E " } }, { email: E2E_EMAIL }] } });
  // Proyectos de obra de prueba (checklist, fotos y acta se borran en cascada). Van antes que los equipos: al borrar un equipo el proyecto solo se desasigna.
  await prisma.project.deleteMany({ where: { id: { startsWith: "e2e-campo" } } });
  // Casos reales de prueba (titulados «E2E …»).
  await prisma.caseStudy.deleteMany({ where: { titleEs: { startsWith: "E2E " } } });
  await cleanupStock();
  await cleanupDemo();
  await cleanupRetention();
  await prisma.team.deleteMany({ where: { name: { startsWith: "E2E " } } });
  await prisma.verification.deleteMany({ where: { identifier: { startsWith: "reset-password:e2e-reset-" } } });
  // Los límites de intentos de cambio/restablecimiento se guardan en la base: se reinician para que la serie se pueda repetir.
  await prisma.rateLimit.deleteMany({ where: { OR: ["/change-password", "/request-password-reset", "/reset-password"].map((path) => ({ key: { endsWith: path } })) } });
  await prisma.user.deleteMany({ where: { email: E2E_EMAIL } });
  await prisma.simulation.deleteMany({ where: { email: E2E_EMAIL } });
  // Privacidad: las solicitudes eliminadas quedan con un correo de relleno y las bajas guardan solo un hash, así que se
  // reconocen por el motivo y por quién las registró (el cliente desde el enlace o un usuario de prueba).
  await prisma.quoteRequest.deleteMany({ where: { contactEmail: "eliminado@invalid.invalid", contactName: "Datos eliminados" } });
  await prisma.suppression.deleteMany({ where: { createdBy: { in: ["cliente", ...Object.values(USERS).map((u) => u.name)] } } });
  await prisma.erasureLog.deleteMany({ where: { by: { in: Object.values(USERS).map((u) => u.name) } } });
  await prisma.rateLimit.deleteMany({ where: { key: { startsWith: "simulation-" } } });
}

/**
 * El simulador limita las solicitudes por conexión (5 por hora). Una corrida de la suite crea más que eso desde la misma IP:
 * aquí las de prueba cambian de «huella» para dejar de contar contra el límite (siguen siendo de prueba y se borran al final).
 */
async function releaseQuoteLimit() {
  await prisma.quoteRequest.updateMany({ where: { contactEmail: E2E_EMAIL }, data: { ipHash: "e2e-released" } });
  // Los límites de guardar cálculos (por conexión y por correo) también se reinician entre pruebas.
  await prisma.rateLimit.deleteMany({ where: { key: { startsWith: "simulation-" } } });
}

/**
 * Un proyecto de obra para el equipo de prueba (y otro de un equipo ajeno, para comprobar que no se ve). Imprime sus ids.
 * No nace de una cotización: el modo campo no la necesita.
 */
async function seedField() {
  // La etiqueta permite sembrar más de un juego de datos en la misma corrida (modo normal y modo sin conexión).
  const tag = process.argv[3] || "1";
  const equipo = await prisma.user.findUniqueOrThrow({ where: { email: USERS.equipo.email } });
  // Lejos de donde simulan los demás flujos e inactivos: estos equipos no deben darle cobertura a ninguna solicitud de prueba.
  const base = { contactName: "Contacto E2E", phone: "+573001112233", city: "Leticia", lat: -4.2, lon: -69.94, active: false };
  const mine = await prisma.team.create({ data: { ...base, name: `E2E Campo ${tag}`, members: { create: { userId: equipo.id } } } });
  const other = await prisma.team.create({ data: { ...base, name: `E2E Campo ajeno ${tag}` } });
  const due = new Date(Date.now() + 30 * 86_400_000);
  const start = new Date();
  const common = { owner: "E2E Admin", due, progress: 0, stage: "install" as const, kwp: 4, town: "Girardot" };
  await prisma.project.create({
    data: {
      ...common, id: `e2e-campo-${tag}`, name: tag === "1" ? "E2E Sistema de campo" : `E2E Sistema de campo ${tag}`, client: "E2E Cliente Campo", teamId: mine.id,
      milestones: { create: [{ labelEs: "Montaje E2E", labelEn: "E2E mounting", startDate: start, len: 2, crew: "A" }, { labelEs: "Conexión E2E", labelEn: "E2E wiring", startDate: start, len: 1, crew: "B" }] },
      materials: { create: [{ nameEs: "Panel E2E", nameEn: "E2E panel", qty: 8 }, { nameEs: "Inversor E2E", nameEn: "E2E inverter", qty: 1 }] },
    },
  });
  await prisma.project.create({ data: { ...common, id: `e2e-campo-ajeno-${tag}`, name: "E2E Proyecto ajeno", client: "E2E Cliente Ajeno", teamId: other.id } });
  console.log(JSON.stringify({ mine: `e2e-campo-${tag}`, other: `e2e-campo-ajeno-${tag}` }));
}

/** Quita los proyectos y equipos de obra de prueba: otras pruebas esperan que no haya proyectos ni equipos al empezar. */
async function cleanupField() {
  await prisma.project.deleteMany({ where: { id: { startsWith: "e2e-campo" } } });
  await prisma.team.deleteMany({ where: { name: { startsWith: "E2E Campo" } } });
}

/** Dos productos de prueba (uno manual y uno de Autosolar con su costo de proveedor) y un proyecto que los usa. Imprime sus ids. */
async function seedStock() {
  const maker = await prisma.manufacturer.upsert({ where: { slug: "e2e-fabricante-stock" }, update: {}, create: { name: "E2E Fabricante Stock", slug: "e2e-fabricante-stock" } });
  const base = { manufacturerId: maker.id, category: "E2E", kind: "panel" as const, active: true, currency: "COP" };
  const own = await prisma.product.create({ data: { ...base, name: "E2E Panel de bodega", slug: "e2e-panel-de-bodega", sku: "E2E-PAN", price: 1_000_000, inStock: true } });
  const supplier = await prisma.product.create({
    data: { ...base, name: "E2E Inversor Autosolar", slug: "e2e-inversor-autosolar", sku: "E2E-INV", source: "autosolar", sourceUrl: "https://e2e.invalid/inversor", price: 900_000, supplierPrice: 700_000, inStock: false },
  });
  await prisma.project.create({
    data: {
      id: "e2e-campo-stock", name: "E2E Proyecto con inventario", client: "E2E Cliente Inventario", town: "Girardot", kwp: 4, stage: "install", owner: "E2E Admin", due: new Date(Date.now() + 30 * 86_400_000), progress: 0,
      materials: { create: [
        { id: "e2e-stock-m1", nameEs: "E2E Panel de bodega", nameEn: "E2E Panel de bodega", qty: 2, productId: own.id, unitPrice: 1_000_000 },
        { id: "e2e-stock-m2", nameEs: "E2E Inversor Autosolar", nameEn: "E2E Inversor Autosolar", qty: 1, productId: supplier.id, unitPrice: 900_000, unitCost: 700_000 },
      ] },
    },
  });
  console.log(JSON.stringify({ own: own.id, supplier: supplier.id, project: "e2e-campo-stock", m1: "e2e-stock-m1", m2: "e2e-stock-m2" }));
}

/** Nombre de demostración para el administrador de prueba (sale en el menú y en los historiales de los videos de las guías). */
async function renameDemoAdmin() {
  await prisma.user.update({ where: { email: USERS.admin.email }, data: { name: "Laura Pérez" } });
}

/**
 * Datos de demostración con nombres de verdad (los videos de las guías se ven en pantalla): un fabricante y dos productos,
 * una cuadrilla en Girardot (inactiva, lejos de donde simulan las pruebas) y un proyecto en obra con cronograma y materiales.
 */
/** Borra los datos de demostración de los videos (llevan nombres reales, por eso se borran por identificador). */
async function cleanupDemo() {
  await prisma.project.deleteMany({ where: { id: "e2e-campo-demo" } });
  await prisma.quoteRequest.deleteMany({ where: { contactEmail: "e2e-video-carlos@example.com" } });
  await prisma.team.deleteMany({ where: { name: { in: ["Cuadrilla Girardot", "Cuadrilla Bucaramanga"] } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: "e2e-demo-" } } });
  await prisma.manufacturer.deleteMany({ where: { slug: { startsWith: "e2e-demo-" } } });
  await prisma.lead.deleteMany({ where: { name: { in: ["Marta Jiménez"] } } });
  await prisma.caseStudy.deleteMany({ where: { titleEs: "Panadería La Esperanza bajó su factura de energía" } });
}

async function seedDemo() {
  await cleanupDemo(); // se puede sembrar más de una vez en la misma corrida
  const maker = await prisma.manufacturer.upsert({ where: { slug: "e2e-demo-solarix" }, update: {}, create: { name: "Solarix", slug: "e2e-demo-solarix" } });
  const base = { manufacturerId: maker.id, active: true, currency: "COP", inStock: true };
  const panel = await prisma.product.create({ data: { ...base, name: "Panel solar Solarix 550 W", slug: "e2e-demo-panel-550", sku: "SLX-550", category: "Paneles solares", kind: "panel", powerW: 550, price: 680_000 } });
  await prisma.product.create({ data: { ...base, name: "Inversor Solarix 5 kW", slug: "e2e-demo-inversor-5kw", sku: "SLX-INV5", category: "Inversores", kind: "inverter_ongrid", powerW: 5000, price: 4_200_000 } });
  const equipo = await prisma.user.findUniqueOrThrow({ where: { email: USERS.equipo.email } });
  const team = await prisma.team.create({
    data: { name: "Cuadrilla Girardot", contactName: "Julián Torres", phone: "+573115550101", city: "Girardot", department: "Cundinamarca", lat: 4.3, lon: -74.8, active: false, members: { create: { userId: equipo.id } } },
  });
  const day = (n: number) => new Date(Date.now() + n * 86_400_000);
  // La solicitud aprobada de la que «nació» el proyecto: con ella el proyecto tiene portal del cliente.
  const items = [
    { productId: panel.id, kind: "panel" as const, nameSnapshot: "Panel solar Solarix 550 W", unitPrice: 680_000, qty: 8 },
    { kind: "inverter_ongrid" as const, nameSnapshot: "Inversor Solarix 5 kW", unitPrice: 4_200_000, qty: 1 },
    { kind: "structure" as const, nameSnapshot: "Estructura de aluminio", unitPrice: 900_000, qty: 1 },
    { kind: "electrical_kit" as const, nameSnapshot: "Cable solar y protecciones", unitPrice: 650_000, qty: 1 },
  ];
  const quote = await prisma.quoteRequest.create({
    data: {
      status: "approved", contactName: "Carlos Rodríguez", contactEmail: "e2e-video-carlos@example.com", contactPhone: "+573105550177", lang: "es", city: "Girardot",
      systemType: "ongrid", bill: { municipality: "Girardot", department: "Cundinamarca" }, sizing: { kwp: 4, monthlySolarKwh: 520, monthlySavings: 410_000 },
      total: 11_190_000, consentAt: new Date(), ipHash: "e2e-released", fulfillment: "install", teamId: team.id,
      items: { create: items }, events: { create: [{ fromStatus: "confirmed", toStatus: "approved", userName: "Laura Pérez" }] },
    },
  });
  await prisma.project.create({
    data: {
      id: "e2e-campo-demo", quoteId: quote.id, name: "Sistema 4 kWp · Girardot", client: "Carlos Rodríguez", town: "Girardot", kwp: 4, stage: "install", owner: "Laura Pérez", due: day(25), progress: 0, teamId: team.id,
      milestones: { create: [
        { labelEs: "Visita técnica", labelEn: "Technical visit", startDate: day(-9), len: 1, crew: "E", done: 100 },
        { labelEs: "Estructura y paneles", labelEn: "Structure and panels", startDate: day(-4), len: 3, crew: "A", done: 60 },
        { labelEs: "Cableado e inversor", labelEn: "Wiring and inverter", startDate: day(0), len: 2, crew: "B", done: 0 },
        { labelEs: "Puesta en marcha", labelEn: "Commissioning", startDate: day(3), len: 1, crew: "B", done: 0 },
      ] },
      materials: { create: [
        { nameEs: "Panel solar Solarix 550 W", nameEn: "Solarix 550 W solar panel", qty: 8, productId: panel.id, unitPrice: 680_000, ready: true },
        { nameEs: "Inversor Solarix 5 kW", nameEn: "Solarix 5 kW inverter", qty: 1, unitPrice: 4_200_000 },
        { nameEs: "Estructura de aluminio", nameEn: "Aluminium structure", qty: 1, unitPrice: 900_000 },
        { nameEs: "Cable solar y protecciones", nameEn: "Solar cable and protections", qty: 1, unitPrice: 650_000 },
      ] },
    },
  });
  console.log(JSON.stringify({ project: "e2e-campo-demo", panel: panel.id }));
}

/** Imprime el id de la solicitud más reciente de un correo (para llegar a ella por la API sin recorrer la pantalla). */
async function quoteIdByEmail() {
  const q = await prisma.quoteRequest.findFirstOrThrow({ where: { contactEmail: process.argv[3] }, orderBy: { createdAt: "desc" }, select: { id: true } });
  console.log(q.id);
}

async function cleanupStock() {
  await prisma.project.deleteMany({ where: { id: "e2e-campo-stock" } });
  await prisma.product.deleteMany({ where: { slug: { in: ["e2e-panel-de-bodega", "e2e-inversor-autosolar"] } } }); // el inventario y sus movimientos se borran en cascada
  await prisma.manufacturer.deleteMany({ where: { slug: "e2e-fabricante-stock" } });
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

/**
 * Datos de la prueba de retención, con fechas viejas puestas a propósito (Prisma respeta un `updatedAt` explícito al crear).
 * Todo lleva el prefijo «e2e-ret-» para que `cleanup` lo borre aunque la limpieza ya haya anonimizado el correo.
 */
async function seedRetention() {
  const months = (n: number) => { const d = new Date(); d.setUTCMonth(d.getUTCMonth() - n); return d; };
  const days = (n: number) => new Date(Date.now() + n * 86_400_000);
  const base = { systemType: "ongrid", bill: { monthlyKwh: 300 }, sizing: { kwp: 3 }, total: 1_000_000, consentAt: months(26), ipHash: "e2e-released", contactPhone: "3001110000" };
  const old = { createdAt: months(26), updatedAt: months(25) };
  const quote = (id: string, extra: object) => prisma.quoteRequest.create({ data: { id: `e2e-ret-${id}`, contactName: `E2E Retención ${id}`, contactEmail: `e2e-ret-${id}@example.com`, ...base, ...old, ...extra } });
  const oldEvent = { events: { create: [{ toStatus: "new" as const, userName: "E2E Admin", note: "Pidió cotización", createdAt: months(25) }] } };
  await quote("vieja", { status: "new", ...oldEvent });
  await quote("evento-reciente", { status: "contacted", events: { create: [{ toStatus: "contacted" as const, userName: "E2E Admin", createdAt: months(1) }] } });
  await quote("aprobada", { status: "approved", ...oldEvent });
  await quote("recordatorio", { status: "new", ...oldEvent, followUps: { create: [{ dueOn: days(5), note: "Llamar", createdBy: "E2E Admin" }] } });
  await prisma.lead.create({ data: { id: "e2e-ret-lead-viejo", name: "E2E Retención contacto viejo", source: "referral", consentAt: months(26), createdBy: "E2E Admin", createdAt: months(26), updatedAt: months(25), notes: { create: [{ body: "Nota vieja", userName: "E2E Admin", createdAt: months(25) }] } } });
  await prisma.lead.create({ data: { id: "e2e-ret-lead-reciente", name: "E2E Retención contacto reciente", source: "referral", consentAt: months(26), createdBy: "E2E Admin", createdAt: months(26), updatedAt: months(25), notes: { create: [{ body: "Nota reciente", userName: "E2E Admin", createdAt: months(1) }] } } });
  const sim = { tokenHash: "", lang: "es", state: {}, summary: {}, createdAt: months(3) };
  await prisma.simulation.create({ data: { ...sim, id: "e2e-ret-sim-vencida", tokenHash: "e2e-ret-sim-vencida", email: "e2e-ret-sim@example.com", expiresAt: days(-1) } });
  await prisma.simulation.create({ data: { ...sim, id: "e2e-ret-sim-vigente", tokenHash: "e2e-ret-sim-vigente", email: "e2e-ret-sim2@example.com", expiresAt: days(30) } });
  const user = { emailVerified: true, role: "equipo" };
  await prisma.user.create({ data: { ...user, id: "e2e-ret-user-baja", name: "E2E Retención baja", email: "e2e-ret-baja@example.com", banned: true, createdAt: months(30), updatedAt: months(13) } });
  await prisma.user.create({ data: { ...user, id: "e2e-ret-user-reciente", name: "E2E Retención reciente", email: "e2e-ret-reciente@example.com", banned: true, createdAt: months(30), updatedAt: months(2) } });
  await prisma.session.create({ data: { id: "e2e-ret-session-vieja", token: "e2e-ret-session-vieja", userId: "e2e-ret-user-reciente", expiresAt: days(-60), ipAddress: "203.0.113.9", userAgent: "e2e" } });
}

/** Qué sobrevivió de lo sembrado por seedRetention, en una línea de JSON. */
async function retentionState() {
  const quotes = await prisma.quoteRequest.findMany({ where: { id: { startsWith: "e2e-ret-" } }, select: { id: true, contactName: true, contactEmail: true, events: { select: { note: true } } } });
  const state = {
    quotes: Object.fromEntries(quotes.map((q) => [q.id.replace("e2e-ret-", ""), { anonymized: q.contactName === "Datos eliminados", eventNotes: q.events.map((e) => e.note) }])),
    leads: (await prisma.lead.findMany({ where: { id: { startsWith: "e2e-ret-" } }, select: { id: true } })).map((l) => l.id.replace("e2e-ret-", "")),
    simulations: (await prisma.simulation.findMany({ where: { id: { startsWith: "e2e-ret-" } }, select: { id: true } })).map((s) => s.id.replace("e2e-ret-", "")),
    users: (await prisma.user.findMany({ where: { id: { startsWith: "e2e-ret-" } }, select: { id: true } })).map((u) => u.id.replace("e2e-ret-", "")),
    sessions: await prisma.session.count({ where: { id: "e2e-ret-session-vieja" } }),
  };
  console.log(JSON.stringify(state));
}

async function cleanupRetention() {
  await prisma.quoteRequest.deleteMany({ where: { id: { startsWith: "e2e-ret-" } } });
  await prisma.lead.deleteMany({ where: { id: { startsWith: "e2e-ret-" } } });
  await prisma.simulation.deleteMany({ where: { id: { startsWith: "e2e-ret-" } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: "e2e-ret-" } } });
  await prisma.erasureLog.deleteMany({ where: { by: "retención automática" } });
}

const actions = { seedRetention, retentionState, cleanupRetention, cleanup, releaseQuoteLimit, seedField, cleanupField, seedStock, cleanupStock, seedDemo, cleanupDemo, quoteIdByEmail, renameDemoAdmin, createUsers, createTempUser, createResetToken, seedBulk, cleanupBulk } as const;
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

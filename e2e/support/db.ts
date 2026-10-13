import { execFileSync } from "node:child_process";

type Action = "cleanup" | "releaseQuoteLimit" | "seedField" | "cleanupField" | "seedStock" | "cleanupStock" | "renameDemoAdmin" | "seedDemo" | "cleanupDemo" | "quoteIdByEmail" | "createUsers" | "createTempUser" | "createResetToken" | "seedBulk" | "cleanupBulk";
const run = (action: Action) => execFileSync(process.execPath, ["--import", "tsx", "e2e/support/db-cli.ts", action], { stdio: "inherit" });
const runOut = (action: Action, ...args: string[]) => execFileSync(process.execPath, ["--import", "tsx", "e2e/support/db-cli.ts", action, ...args], { encoding: "utf8" }).trim().split("\n").pop()!;

/** Borra solo lo que crean estas pruebas (prefijo "e2e"/"E2E"). */
export const cleanup = () => run("cleanup");
/** Las solicitudes de prueba dejan de contar contra el límite por hora del simulador (5 por conexión). */
export const releaseQuoteLimit = () => run("releaseQuoteLimit");
export const createUsers = () => run("createUsers");
/** 230 solicitudes y 60 proyectos para probar la paginación; `cleanupBulk` los quita. */
export const seedBulk = () => run("seedBulk");
export const cleanupBulk = () => run("cleanupBulk");
/** Cuenta con contraseña temporal para probar el cambio obligatorio. */
export const createTempUser = () => JSON.parse(runOut("createTempUser")) as { name: string; email: string; password: string };
/** Token de restablecimiento válido (el que llegaría por correo) para la cuenta temporal de prueba. */
export const createResetToken = () => runOut("createResetToken");
/** Un proyecto de obra asignado al equipo de prueba y otro de un equipo ajeno. Devuelve sus ids. */
export const seedField = (tag = "1") => JSON.parse(runOut("seedField", tag)) as { mine: string; other: string };
/** Quita lo sembrado por `seedField`. */
export const cleanupField = () => run("cleanupField");
export const seedStock = () => JSON.parse(runOut("seedStock")) as { own: string; supplier: string; project: string; m1: string; m2: string };
export const cleanupStock = () => run("cleanupStock");
export const renameDemoAdmin = () => run("renameDemoAdmin");
export const cleanupDemo = () => run("cleanupDemo");
export const quoteIdByEmail = (email: string) => runOut("quoteIdByEmail", email);
export const seedDemo = () => JSON.parse(runOut("seedDemo")) as { project: string; panel: string };

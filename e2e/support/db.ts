import { execFileSync } from "node:child_process";

type Action = "cleanup" | "createUsers" | "createTempUser" | "createResetToken" | "seedBulk" | "cleanupBulk";
const run = (action: Action) => execFileSync(process.execPath, ["--import", "tsx", "e2e/support/db-cli.ts", action], { stdio: "inherit" });
const runOut = (action: Action) => execFileSync(process.execPath, ["--import", "tsx", "e2e/support/db-cli.ts", action], { encoding: "utf8" }).trim().split("\n").pop()!;

/** Borra solo lo que crean estas pruebas (prefijo "e2e"/"E2E"). */
export const cleanup = () => run("cleanup");
export const createUsers = () => run("createUsers");
/** 230 solicitudes y 60 proyectos para probar la paginación; `cleanupBulk` los quita. */
export const seedBulk = () => run("seedBulk");
export const cleanupBulk = () => run("cleanupBulk");
/** Cuenta con contraseña temporal para probar el cambio obligatorio. */
export const createTempUser = () => JSON.parse(runOut("createTempUser")) as { name: string; email: string; password: string };
/** Token de restablecimiento válido (el que llegaría por correo) para la cuenta temporal de prueba. */
export const createResetToken = () => runOut("createResetToken");

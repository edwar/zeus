import { execFileSync } from "node:child_process";

const run = (action: "cleanup" | "createUsers" | "seedBulk" | "cleanupBulk") =>
  execFileSync(process.execPath, ["--import", "tsx", "e2e/support/db-cli.ts", action], { stdio: "inherit" });

/** Borra solo lo que crean estas pruebas (prefijo "e2e"/"E2E"). */
export const cleanup = () => run("cleanup");
export const createUsers = () => run("createUsers");
/** 230 solicitudes y 60 proyectos para probar la paginación; `cleanupBulk` los quita. */
export const seedBulk = () => run("seedBulk");
export const cleanupBulk = () => run("cleanupBulk");

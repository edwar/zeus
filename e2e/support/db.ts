import { execFileSync } from "node:child_process";

const run = (action: "cleanup" | "createUsers") =>
  execFileSync(process.execPath, ["--import", "tsx", "e2e/support/db-cli.ts", action], { stdio: "inherit" });

/** Borra solo lo que crean estas pruebas (prefijo "e2e"/"E2E"). */
export const cleanup = () => run("cleanup");
export const createUsers = () => run("createUsers");

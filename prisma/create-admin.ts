// Crea el primer administrador (o uno adicional) sin pasar por la UI.
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... [ADMIN_NAME=...] pnpm db:create-admin
import "dotenv/config";
import { auth } from "../src/lib/auth";

const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password, ADMIN_NAME: name = "Administrador" } = process.env;

if (!email || !password) {
  console.error("Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD.");
  process.exit(1);
}

auth.api
  .createUser({ body: { email, password, name, role: "admin" } })
  .then(({ user }) => console.log(`Administrador creado: ${user.email}`))
  .catch((e) => {
    console.error(e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());

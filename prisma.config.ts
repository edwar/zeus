import "dotenv/config";
import { defineConfig } from "prisma/config";

// Las migraciones usan la conexión directa de Neon (DIRECT_URL); sin ella se cae a DATABASE_URL.
// `prisma generate` (postinstall) no se conecta, así que no debe romper el build si la variable aún no existe:
// el valor de reserva solo hace fallar con un error claro a quien intente migrar sin configurarla.
const url = process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://sin-configurar:sin-configurar@localhost:5432/sin-configurar";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url },
});

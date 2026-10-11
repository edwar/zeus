import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const make = () => new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// En desarrollo el módulo se recarga pero globalThis no: el cliente cacheado quedaría viejo tras
// `prisma generate` (modelos, campos, relaciones o enums nuevos). La clave es un hash del modelo de datos del
// client generado, así que cambia sola y se descarta el cliente anterior.
function dev(): PrismaClient {
  const fresh = make();
  const model = (fresh as unknown as { _runtimeDataModel?: unknown })._runtimeDataModel;
  const key = `prisma:${createHash("sha1").update(JSON.stringify(model ?? "")).digest("hex")}`;
  const g = globalThis as unknown as Record<string, PrismaClient | undefined>;
  return (g[key] ??= fresh);
}

export const prisma = process.env.NODE_ENV === "production" ? make() : dev();

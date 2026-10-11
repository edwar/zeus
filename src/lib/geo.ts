import { prisma } from "./prisma";
import { ipHashOf } from "./ratelimit";

export const UA = "ZeusSolarSimulator/1.0 (+https://zeus.example)";

/** Contador por IP y ventana fija usando la tabla `rateLimit`. Devuelve true si aún hay cupo. */
export async function allow(req: Request, name: string, max: number, windowSec: number): Promise<boolean> {
  const now = Date.now();
  const key = `${name}:${ipHashOf(req)}:${Math.floor(now / (windowSec * 1000))}`;
  const row = await prisma.rateLimit.upsert({
    where: { key },
    create: { id: key, key, count: 1, lastRequest: BigInt(now) },
    update: { count: { increment: 1 }, lastRequest: BigInt(now) },
  });
  if (Math.random() < 0.01) await prisma.rateLimit.deleteMany({ where: { key: { startsWith: `${name}:` }, lastRequest: { lt: BigInt(now - 86_400_000) } } });
  return row.count <= max;
}

export type Place = { label: string; lat: number; lon: number };
export type Located = { sun: { annual: number; min: number } | null; municipality: string | null; department: string | null };

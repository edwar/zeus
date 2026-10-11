import { createHash } from "node:crypto";
import { prisma } from "./prisma";

export const EXTRACT_LIMITS = {
  perHour: 5,
  perDay: 20,
  // Tope global diario: acota el gasto del Gateway aunque alguien rote de IP. Ajustable con EXTRACT_DAILY_CAP.
  globalPerDay: Number(process.env.EXTRACT_DAILY_CAP) || 300,
};

/**
 * IP del cliente. En Vercel `x-vercel-forwarded-for` y `x-real-ip` los fija la plataforma y el cliente no puede
 * falsearlos; `x-forwarded-for` queda como último recurso (fuera de Vercel un cliente podría inventarlo).
 */
export function clientIp(req: Request): string {
  const h = (n: string) => req.headers.get(n)?.split(",")[0]?.trim();
  return h("x-vercel-forwarded-for") || h("x-real-ip") || h("x-forwarded-for") || "unknown";
}

/** IP del cliente con hash salado: nunca se guarda la IP en claro. */
export function ipHashOf(req: Request): string {
  const ip = clientIp(req);
  const salt = process.env.RATE_LIMIT_SALT || process.env.BETTER_AUTH_SECRET || "dev-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export type LimitResult = { ok: true } | { ok: false; reason: "ip" | "capacity"; retryAfterSec: number };

/** Cuenta los intentos recientes; falla si esa IP superó su límite o si el servicio llegó al tope global del día. */
export async function checkExtractionLimit(ipHash: string): Promise<LimitResult> {
  const now = Date.now();
  const since = (ms: number) => ({ gt: new Date(now - ms) });
  const [hour, day, global] = await Promise.all([
    prisma.extractionLog.count({ where: { ipHash, createdAt: since(3_600_000) } }),
    prisma.extractionLog.count({ where: { ipHash, createdAt: since(86_400_000) } }),
    prisma.extractionLog.count({ where: { createdAt: since(86_400_000) } }),
  ]);
  if (hour >= EXTRACT_LIMITS.perHour) return { ok: false, reason: "ip", retryAfterSec: 3600 };
  if (day >= EXTRACT_LIMITS.perDay) return { ok: false, reason: "ip", retryAfterSec: 86_400 };
  if (global >= EXTRACT_LIMITS.globalPerDay) return { ok: false, reason: "capacity", retryAfterSec: 3600 };
  return { ok: true };
}

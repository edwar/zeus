import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  // Las migraciones de la base se aplican solo en producción: un preview no debe tocar la base real.
  // Si una migración falla, el build falla y la versión anterior sigue sirviendo.
  buildCommand: 'if [ "$VERCEL_ENV" = "production" ]; then npx prisma migrate deploy; fi && next build',
  // 05:00 UTC = 00:00 en Colombia (UTC-5, sin horario de verano). En el plan Hobby Vercel lo ejecuta en cualquier
  // momento de esa hora (entre 00:00 y 00:59). El endpoint se encadena solo hasta terminar el catálogo.
  crons: [{ path: "/api/cron/sync", schedule: "0 5 * * *" }],
};

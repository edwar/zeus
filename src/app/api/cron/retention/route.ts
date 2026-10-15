import { timingSafeEqual } from "node:crypto";
import { runRetention } from "@/lib/retention";

export const maxDuration = 120;

/** Compara en tiempo constante para no filtrar el secreto por diferencias de tiempo. */
function validBearer(header: string | null, secret: string) {
  const a = Buffer.from(header ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Cron diario (vercel.ts): aplica los plazos de conservación de la política de privacidad. Vercel envía `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16 || !validBearer(req.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return Response.json(await runRetention(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("retention", e);
    return Response.json({ error: "retention_failed" }, { status: 500 });
  }
}

import { generateText, NoObjectGeneratedError, Output } from "ai";
import { prisma } from "@/lib/prisma";
import { BILL_SYSTEM_PROMPT, billSchema } from "@/lib/ai/bill";
import { detectType } from "@/lib/files";
import { checkExtractionLimit, ipHashOf } from "@/lib/ratelimit";
import { tooLarge } from "@/lib/http";

export const maxDuration = 60;

// Vercel rechaza cuerpos de petición > 4,5 MB: el tope va por debajo (el cliente reduce las fotos).
const MAX_FILES = 3;
const MAX_TOTAL_BYTES = 4_200_000;
const MODEL = "anthropic/claude-sonnet-5.5";

const err = (status: number, code: string, headers?: HeadersInit) => Response.json({ error: code }, { status, headers });

/**
 * Lee una o varias facturas con IA y devuelve los datos para que el usuario los revise.
 * Las facturas se procesan en memoria: no se guardan ni se registran.
 */
export async function POST(req: Request) {
  const big = tooLarge(req, MAX_TOTAL_BYTES + 100_000); // archivos + sobrecarga del multipart
  if (big) return big;
  const form = await req.formData().catch(() => null);
  if (!form) return err(400, "invalid_body");

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return err(400, "no_files");
  if (files.length > MAX_FILES) return err(400, "too_many_files");
  if (files.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_BYTES) return err(413, "too_large");

  const parts: { type: "file"; mediaType: string; data: Uint8Array }[] = [];
  for (const f of files) {
    const data = new Uint8Array(await f.arrayBuffer());
    const mediaType = detectType(data);
    if (!mediaType) return err(415, "unsupported_type");
    parts.push({ type: "file", mediaType, data });
  }

  const ipHash = ipHashOf(req);
  const limit = await checkExtractionLimit(ipHash);
  if (!limit.ok) return err(429, limit.reason === "capacity" ? "busy" : "rate_limited", { "Retry-After": String(limit.retryAfterSec) });

  // El intento se registra antes de llamar al modelo: los fallos también cuestan.
  const log = await prisma.extractionLog.create({ data: { ipHash, files: files.length } });

  try {
    const result = await generateText({
      model: MODEL,
      system: BILL_SYSTEM_PROMPT,
      output: Output.object({ schema: billSchema }),
      temperature: 0,
      maxOutputTokens: 3000,
      abortSignal: AbortSignal.timeout(50_000),
      messages: [{ role: "user", content: [{ type: "text", text: "Extrae los datos de estas facturas de energía." }, ...parts] }],
    });
    const bill = result.output;
    await prisma.extractionLog.update({ where: { id: log.id }, data: { ok: true, tokens: result.usage?.totalTokens ?? null } });

    if (!bill.isEnergyBill) return err(422, "not_a_bill");
    return Response.json({ bill });
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) return err(422, "unreadable");
    console.error("extract failed:", (e as Error).message);
    return err(502, "ai_unavailable");
  }
}

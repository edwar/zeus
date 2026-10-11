import { z } from "zod";
import { allow } from "@/lib/geo";
import { bankRates, currentUsury } from "@/lib/finance/rates";
import { marketAverage, termBucket } from "@/lib/finance/rates-core";

const query = z.object({ term: z.coerce.number().int().min(6).max(120).default(36) });

/**
 * Público: tasas de referencia para simular el crédito del kit.
 * Vienen de datos abiertos de la Superfinanciera (créditos de consumo realmente desembolsados), no de ofertas de bancos.
 */
export async function GET(req: Request) {
  if (!(await allow(req, "finrates", 40, 60))) return Response.json({ error: "rate_limited" }, { status: 429 });
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return Response.json({ error: "invalid_query" }, { status: 400 });
  const term = parsed.data.term;

  // Cada fuente falla por separado: sin una de ellas el simulador sigue funcionando con la tasa que escriba el usuario.
  const [usury, rates] = await Promise.allSettled([currentUsury(), bankRates(term)]);
  return Response.json({
    term,
    bucket: termBucket(term),
    usury: usury.status === "fulfilled" ? usury.value : null,
    market: rates.status === "fulfilled" ? marketAverage(rates.value.banks) : null,
    banks: rates.status === "fulfilled" ? rates.value.banks.slice(0, 8) : [],
    cutoff: rates.status === "fulfilled" ? rates.value.cutoff : null,
    degraded: usury.status === "rejected" || rates.status === "rejected",
  });
}

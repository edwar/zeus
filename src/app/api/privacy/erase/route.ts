import type { NextRequest } from "next/server";
import { authorize } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { privacyBody } from "@/lib/crm";
import { eraseSubject } from "@/lib/erasure";

/** Elimina los datos de una persona (solicitudes, contactos, cálculos). Irreversible: la interfaz pide confirmación antes. */
export async function POST(req: NextRequest) {
  const big = tooLarge(req, 1_000);
  if (big) return big;
  const a = await authorize(req, "quotes");
  if (a.denied) return a.denied;
  const parsed = privacyBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const result = await eraseSubject("quoteId" in parsed.data ? { quoteId: parsed.data.quoteId } : { leadId: parsed.data.leadId }, a.name);
  if (!result) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(result);
}

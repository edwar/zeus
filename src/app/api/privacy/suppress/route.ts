import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { tooLarge } from "@/lib/http";
import { privacyBody } from "@/lib/crm";
import { suppressEmail } from "@/lib/suppression";

/** «No enviar más correos»: la persona lo pidió (por ejemplo respondiendo a un correo). No borra ningún dato. */
export async function POST(req: NextRequest) {
  const big = tooLarge(req, 1_000);
  if (big) return big;
  const a = await authorize(req, "quotes");
  if (a.denied) return a.denied;
  const parsed = privacyBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const email = "quoteId" in parsed.data
    ? (await prisma.quoteRequest.findUnique({ where: { id: parsed.data.quoteId }, select: { contactEmail: true } }))?.contactEmail
    : (await prisma.lead.findUnique({ where: { id: parsed.data.leadId }, select: { email: true } }))?.email;
  if (email === undefined) return Response.json({ error: "not_found" }, { status: 404 });
  if (!email) return Response.json({ error: "no_email" }, { status: 409 });
  await suppressEmail(email, "staff", a.name);
  return Response.json({ ok: true });
}

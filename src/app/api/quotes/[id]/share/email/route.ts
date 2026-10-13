import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { hashShareToken, shareState, TOKEN_RE } from "@/lib/quote-share";
import { noticeLink } from "@/lib/client-notices";
import { absoluteUrl } from "@/lib/site";

const body = z.object({ url: z.string().max(300) });

/**
 * Manda por correo el enlace que el asesor acaba de generar. El servidor no guarda el token, solo su hash: por eso el
 * enlace viaja desde la pantalla y aquí se comprueba que sea el vigente de ESTA solicitud. Así no se puede usar para
 * mandarle al cliente cualquier otro enlace, y la URL se reconstruye en el servidor.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/quotes/[id]/share/email">) {
  const a = await authorize(req, "quotes");
  if (a.denied) return a.denied;
  const { id } = await ctx.params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });

  const token = (() => {
    try {
      return new URL(parsed.data.url).pathname.split("/").pop() ?? "";
    } catch {
      return "";
    }
  })();
  const q = await prisma.quoteRequest.findUnique({ where: { id }, select: { lang: true, status: true, shareTokenHash: true, shareExpiresAt: true, clientDecision: true } });
  if (!q) return Response.json({ error: "not_found" }, { status: 404 });
  if (!TOKEN_RE.test(token) || q.shareTokenHash !== hashShareToken(token)) return Response.json({ error: "invalid_link" }, { status: 409 });
  if (shareState(q) === "expired" || shareState(q) === "closed") return Response.json({ error: "link_unavailable" }, { status: 409 });

  // El enlace se arma aquí con el token ya verificado y el idioma del cliente; el host que llegue en la petición no se usa.
  const outcome = await noticeLink(id, absoluteUrl(`/${q.lang === "en" ? "en" : "es"}/q/${token}`), q.shareExpiresAt!, a.name);
  return Response.json({ outcome });
}

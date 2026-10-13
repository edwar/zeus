import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/session";
import { staffWhere } from "@/lib/crm-server";

/** Personas a quienes se les puede asignar un recordatorio (las que atienden solicitudes). */
export async function GET(req: NextRequest) {
  const a = await authorize(req, "quotes");
  if (a.denied) return a.denied;
  const users = await prisma.user.findMany({ where: staffWhere, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return Response.json({ me: a.userId, users });
}

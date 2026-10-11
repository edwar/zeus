import { prisma } from "@/lib/prisma";
import { toProjectDto } from "@/lib/projects";
import { authorize, projectScope } from "@/lib/session";

export async function GET(req: Request) {
  const a = await authorize(req, "projects.view");
  if (a.denied) return a.denied;
  const projects = await prisma.project.findMany({ where: projectScope(a.role, a.userId), include: { team: { select: { name: true } }, _count: { select: { alerts: { where: { resolvedAt: null } } } } }, orderBy: [{ due: "asc" }, { id: "asc" }] });
  return Response.json(projects.map(({ _count, ...p }) => ({ ...toProjectDto(p), openAlerts: _count.alerts })));
}

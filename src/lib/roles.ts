/**
 * Roles de la plataforma y qué puede hacer cada uno. Se usa en el servidor (API y páginas) y en la interfaz.
 *
 * - admin:   todo (usuarios, catálogo y comisión, equipos, solicitudes y proyectos).
 * - gestion: atiende al cliente y gestiona el proyecto: solicitudes, proyectos y equipos. No toca usuarios ni catálogo.
 * - equipo:  solo la instalación: ve los proyectos de SU equipo y reporta avance, materiales y alertas.
 */
export const ROLES = ["admin", "gestion", "equipo"] as const;
export type Role = (typeof ROLES)[number];

export type Perm =
  | "quotes" //            solicitudes de clientes (datos de contacto y precios)
  | "cases" //             casos reales y testimonios que se publican en la landing
  | "stock" //             inventario propio, costos y margen (nunca lo ve el equipo de instalación)
  | "catalog" //           productos, fabricantes, comisión y sincronización
  | "users" //             cuentas del equipo de trabajo
  | "teams.view" //        ver los equipos operativos
  | "teams.edit" //        crear/editar equipos, tarifas e integrantes
  | "teams.delete" //      eliminar equipos
  | "projects.view" //     ver proyectos (el rol equipo solo los de su equipo)
  | "projects.manage" //   etapa, estructura del cronograma, enlace de monitoreo, borrar alertas
  | "projects.progress"; // avance de hitos, materiales listos, registrar/atender alertas

const MATRIX: Record<Role, readonly Perm[]> = {
  admin: ["quotes", "cases", "stock", "catalog", "users", "teams.view", "teams.edit", "teams.delete", "projects.view", "projects.manage", "projects.progress"],
  gestion: ["quotes", "cases", "stock", "teams.view", "teams.edit", "projects.view", "projects.manage", "projects.progress"],
  equipo: ["projects.view", "projects.progress"],
};

/** Cualquier valor desconocido (incluido el antiguo "user") cae en el rol con menos permisos. */
export function normalizeRole(role: string | null | undefined): Role {
  return (ROLES as readonly string[]).includes(role ?? "") ? (role as Role) : "equipo";
}

export const can = (role: string | null | undefined, perm: Perm): boolean => MATRIX[normalizeRole(role)].includes(perm);

/** Pantalla de inicio de cada rol (y a dónde se lleva a quien entra a una sección que no le corresponde). */
export const homeFor = (role: string | null | undefined, lang: string) => `/${lang}/app/${can(role, "quotes") ? "quotes" : "projects"}`;

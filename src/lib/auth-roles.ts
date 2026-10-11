import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

// Los tres roles de la plataforma (ver src/lib/roles.ts). Los permisos de la app se aplican con `can()`; aquí solo se
// declara qué roles existen para que Better Auth rechace cualquier otro valor y solo "admin" gestione usuarios.
// Se comparte entre el servidor (auth.ts) y el navegador (auth-client.ts) para que los tipos coincidan.
export const ac = createAccessControl(defaultStatements);
export const roles = { admin: ac.newRole({ ...adminAc.statements }), gestion: ac.newRole({}), equipo: ac.newRole({}) };

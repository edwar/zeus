"use client";

import { createContext, useContext } from "react";
import { can, type Perm, type Role } from "@/lib/roles";

const RoleContext = createContext<Role>("equipo"); // sin proveedor, el rol con menos permisos

export const RoleProvider = RoleContext.Provider;
export const useRole = () => useContext(RoleContext);
/** ¿El usuario actual tiene este permiso? Solo para mostrar u ocultar controles: el servidor decide de verdad. */
export const useCan = (perm: Perm) => can(useContext(RoleContext), perm);

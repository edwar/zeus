import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { prisma } from "./prisma";
import { SITE_URL } from "./site";
import { ac, roles } from "./auth-roles";

const prod = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  // El dominio real (zeus.cognilab.dev en producción). BETTER_AUTH_URL tiene prioridad si está definida.
  baseURL: process.env.BETTER_AUTH_URL || SITE_URL,
  // Orígenes desde los que se aceptan peticiones con sesión: el dominio propio, la URL de producción que asigna Vercel
  // (útil mientras el dominio propio no apunta aún) y, en previews, la URL del despliegue.
  trustedOrigins: [
    SITE_URL,
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // Usuarios internos: no hay registro público. Solo un admin crea cuentas (plugin admin).
    disableSignUp: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },
  // Límite de intentos persistido en la base de datos: en serverless cada instancia tiene su propia memoria,
  // así que el límite por defecto (en memoria) casi no frena la fuerza bruta. Activo también en desarrollo.
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 10,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/change-password": { window: 300, max: 5 },
      "/admin/create-user": { window: 60, max: 10 },
    },
  },
  advanced: {
    useSecureCookies: prod, // cookie de sesión con prefijo __Secure- y atributo Secure en producción
    // En Vercel estas cabeceras las fija la plataforma y el cliente no puede falsearlas.
    ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for"] },
  },
  plugins: [
    admin({ ac, roles, defaultRole: "equipo", adminRoles: ["admin"] }), // createUser, ban/unban, setRole
    nextCookies(), // siempre al final
  ],
});

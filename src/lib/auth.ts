import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";
import { prisma } from "./prisma";
import { SITE_URL } from "./site";
import { ac, roles } from "./auth-roles";
import { mailConfigured, resetPasswordEmail, sendMail } from "./mail";

const prod = process.env.NODE_ENV === "production";
const RESET_MINUTES = 30;

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
    resetPasswordTokenExpiresIn: RESET_MINUTES * 60,
    revokeSessionsOnPasswordReset: true,
    // Enlace de «olvidé mi contraseña». Better Auth responde igual exista o no el correo; aquí no se debe filtrar nada.
    sendResetPassword: async ({ user, url }) => {
      if (!mailConfigured()) return console.warn("[auth] Restablecer contraseña pedido, pero falta RESEND_API_KEY/MAIL_FROM: no se envió correo.");
      const lang = new URL(url).searchParams.get("callbackURL")?.includes("/en/") ? "en" : "es";
      try {
        await sendMail({ to: user.email, ...resetPasswordEmail({ name: user.name, url, lang, minutes: RESET_MINUTES }) });
      } catch (e) {
        console.error("[auth] No se pudo enviar el correo de restablecimiento:", e instanceof Error ? e.message : e);
      }
    },
    // Al restablecer por correo la contraseña deja de ser temporal.
    onPasswordReset: async ({ user }) => {
      await prisma.user.update({ where: { id: user.id }, data: { mustChangePassword: false } });
    },
  },
  user: { additionalFields: { mustChangePassword: { type: "boolean", defaultValue: false, input: false } } },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Toda cuenta creada por un admin arranca con contraseña temporal; al cambiarla deja de serlo.
      const returned = ctx.context.returned as { user?: { id?: string } } | undefined;
      if (returned instanceof Error) return; // la operación falló: no se toca nada
      const id = returned?.user?.id;
      if (!id) return;
      if (ctx.path === "/admin/create-user") await prisma.user.update({ where: { id }, data: { mustChangePassword: true } });
      else if (ctx.path === "/change-password") await prisma.user.update({ where: { id }, data: { mustChangePassword: false } });
    }),
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
      "/request-password-reset": { window: 300, max: 3 },
      "/reset-password": { window: 300, max: 5 },
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

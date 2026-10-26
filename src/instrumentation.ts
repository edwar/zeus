import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Ninguna ruta usa el runtime edge (el proxy corre en Node), así que solo se inicializa el servidor.
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
}

// Errores de peticiones del servidor (páginas, rutas API, acciones).
export const onRequestError = Sentry.captureRequestError;

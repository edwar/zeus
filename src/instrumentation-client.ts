import * as Sentry from "@sentry/nextjs";

// El DSN es público (va en el bundle del navegador); la variable permite apuntar a otro proyecto sin tocar el código.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "https://6d1b499e1ec2f257cc1e78eed8e42dcf@o4512321058373632.ingest.us.sentry.io/4512321069580288",
  // `production` / `preview` en Vercel; `development` en local.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  // En desarrollo se envía todo para poder probar; en producción una de cada diez trazas.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1 : 0.1,
});

// Las navegaciones del App Router quedan como trazas.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

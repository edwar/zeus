import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// Origen de las imágenes de productos (almacenamiento propio). Vacío si aún no está configurado.
const storageOrigin = (() => {
  try {
    return new URL(process.env.STORAGE_PUBLIC_URL ?? process.env.STORAGE_ENDPOINT ?? "").origin;
  } catch {
    return "";
  }
})();

// CSP: todo del mismo origen salvo las imágenes del catálogo. 'unsafe-inline' en scripts/estilos lo exige Next
// para su arranque (no usamos nonces); lo que importa aquí es bloquear frames ajenos, <object>, <base> y destinos
// de formularios/conexiones externos. En desarrollo se permite eval y WebSocket (recarga en caliente).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://tile.openstreetmap.org ${storageOrigin}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Las pruebas E2E del modo sin conexión compilan y sirven una versión de producción aparte (otro directorio): no pisa el servidor de desarrollo.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  // Solo se valida la navegación instantánea en los segmentos que exporten `instant`. El panel (/app) depende de la sesión
  // de cada petición y se pinta con un Client Component (AppShell), así que la validación implícita fallaba en todas sus
  // rutas con "Could not validate `instant`…". Es solo un aviso de desarrollo; no afecta al build.
  experimental: {
    instantInsights: { validationLevel: "manual-warning" },
    // 404 para URLs que no coinciden con ninguna ruta: el layout raíz depende de [lang], así que no puede componerlo.
    globalNotFound: true,
  },
  poweredByHeader: false,
  // La guía del equipo se lee de archivos Markdown en tiempo de ejecución: hay que incluirlos en el despliegue.
  outputFileTracingIncludes: { "/[lang]/app/guide": ["./docs/guia-equipo/**/*.md"], "/[lang]/app/guide/[slug]": ["./docs/guia-equipo/**/*.md"], "/api/guide/video/[file]": ["./docs/guia-equipo/videos/*"] },
  async redirects() {
    return [
      { source: "/:lang/catalog", destination: "/:lang/simulator", permanent: true },
      { source: "/:lang/quote", destination: "/:lang/simulator", permanent: true },
      // Al entrar a la plataforma se empieza por las solicitudes (temporal: puede cambiar).
      { source: "/:lang/app", destination: "/:lang/app/quotes", permanent: false },
      // El cronograma vive ahora dentro de cada proyecto (el modo campo volvió como pantalla propia: /app/field).
      { source: "/:lang/app/schedule", destination: "/:lang/app/projects", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Videos públicos de la guía del comprador: se guardan un día y se revalidan en segundo plano (el nombre no lleva versión).
      { source: "/guia/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
      // El service worker se revisa en cada visita: una versión nueva no se queda atrás por el caché del navegador.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
};

export default nextConfig;

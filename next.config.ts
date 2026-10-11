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
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/:lang/catalog", destination: "/:lang/simulator", permanent: true },
      { source: "/:lang/quote", destination: "/:lang/simulator", permanent: true },
      // Al entrar a la plataforma se empieza por las solicitudes (temporal: puede cambiar).
      { source: "/:lang/app", destination: "/:lang/app/quotes", permanent: false },
      // Cronograma y campo viven ahora dentro de cada proyecto.
      { source: "/:lang/app/schedule", destination: "/:lang/app/projects", permanent: true },
      { source: "/:lang/app/field", destination: "/:lang/app/projects", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

// Túnel de Sentry: el navegador envía aquí sus eventos (mismo origen, sin abrir la CSP ni toparse con bloqueadores).
export { POST } from "@sentry/nextjs/tunnel";

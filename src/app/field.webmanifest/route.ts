import { defaultLocale, hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";

/** Manifiesto de la app de campo: al instalarla desde el teléfono abre directo el modo campo, en el idioma de quien la instaló. */
export async function GET(req: Request) {
  const l = new URL(req.url).searchParams.get("lang") ?? "";
  const lang = hasLocale(l) ? l : defaultLocale;
  const t = getDict(lang);
  const body = {
    name: `Zeus · ${t.app.fieldMode.title}`,
    short_name: "Zeus Campo",
    description: t.app.fieldMode.sub,
    id: `/${lang}/app/field`,
    start_url: `/${lang}/app/field`,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffc21a",
    theme_color: "#ffc21a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

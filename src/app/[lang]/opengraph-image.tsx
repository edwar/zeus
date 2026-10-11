import { ImageResponse } from "next/og";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { SITE_URL } from "@/lib/site";

// Imagen que se ve al compartir el enlace en WhatsApp, redes y buscadores. Se genera por idioma.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Zeus · Energía solar y domótica";

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = getDict(hasLocale(lang) ? lang : "es");
  const bar = (x: number) => <div style={{ position: "absolute", top: 0, bottom: 0, left: x, width: 48, background: "#f5b82e", display: "flex" }} />;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#082017", position: "relative", color: "#eaf5ee", fontFamily: "sans-serif" }}>
        {/* Franjas del logo, como celosía a la derecha */}
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 360, display: "flex", background: "#0e2f23" }}>
          {bar(24)}
          {bar(120)}
          {bar(216)}
          {bar(312)}
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: 840 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 10, background: "#f5b82e", display: "flex", position: "relative" }}>
              <div style={{ position: "absolute", left: 9, top: 0, bottom: 0, width: 9, background: "#082017", display: "flex" }} />
              <div style={{ position: "absolute", left: 27, top: 0, bottom: 0, width: 9, background: "#082017", display: "flex" }} />
              <div style={{ position: "absolute", left: 45, top: 0, bottom: 0, width: 9, background: "#082017", display: "flex" }} />
            </div>
            <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: -1, display: "flex" }}>{t.brand}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5, display: "flex" }}>{t.hero.title}</div>
            <div style={{ fontSize: 28, color: "#a9c7b8", lineHeight: 1.35, display: "flex" }}>{t.meta.orgDescription}</div>
          </div>

          <div style={{ display: "flex", fontSize: 28, color: "#f5b82e", fontWeight: 700 }}>{new URL(SITE_URL).host}</div>
        </div>
      </div>
    ),
    size,
  );
}

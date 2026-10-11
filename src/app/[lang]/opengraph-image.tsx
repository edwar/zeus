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
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#ffc21a", position: "relative", color: "#0b1f18", fontFamily: "sans-serif" }}>
        {/* Sol grande a la derecha: disco, anillo y rayos */}
        <div style={{ position: "absolute", right: -150, top: 95, width: 520, height: 520, borderRadius: 260, background: "#fff1b8", border: "10px solid #0b1f18", display: "flex" }} />
        <div style={{ position: "absolute", right: -70, top: 175, width: 360, height: 360, borderRadius: 180, background: "#ffc21a", border: "10px solid #0b1f18", display: "flex" }} />
        <div style={{ position: "absolute", right: 25, top: 215, display: "flex" }}>
          <svg width="310" height="310" viewBox="0 0 32 32"><path d="M18.5 5.5 9 18h6l-1.5 8.5L23 14h-6z" fill="#0b1f18" strokeLinejoin="round" /></svg>
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: 860 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 68, height: 68, borderRadius: 34, background: "#ffc21a", border: "6px solid #0b1f18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="40" height="40" viewBox="0 0 32 32"><path d="M18.5 5.5 9 18h6l-1.5 8.5L23 14h-6z" fill="#0b1f18" /></svg>
            </div>
            <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -2, display: "flex" }}>{t.brand}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2.5, display: "flex" }}>{t.hero.title}</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", padding: "12px 28px", borderRadius: 40, background: "#0b1f18", color: "#ffffff", fontSize: 28, fontWeight: 700 }}>{new URL(SITE_URL).host}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zeus · Energía solar y domótica",
    short_name: "Zeus",
    description: "Simulador de ahorro solar, kits y gestión de proyectos de energía solar.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7f5",
    theme_color: "#082017",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

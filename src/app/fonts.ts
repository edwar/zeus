import { Gabarito, Figtree } from "next/font/google";

// Compartidas por el layout raíz y por la página 404 global (que no pasa por el layout).
export const gabarito = Gabarito({ variable: "--font-gabarito", subsets: ["latin"], display: "swap" });
export const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], display: "swap" });
export const fontClasses = `${gabarito.variable} ${figtree.variable}`;

import { connection } from "next/server";
import { LEGAL, pendingFields } from "@/lib/legal/config";

/** security.txt (RFC 9116): dónde reportar una vulnerabilidad. Vence en 6 meses y se renueva en cada petición. */
export function securityTxt(now: Date, email: string, site: string) {
  const expires = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
  return [
    `Contact: mailto:${email}`,
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: es, en",
    `Canonical: ${site}/.well-known/security.txt`,
    `Policy: ${site}/es/security`,
    "",
  ].join("\n");
}

export async function GET() {
  await connection(); // depende de la hora: nunca se prerenderiza
  // Sin un correo real no se publica nada: un marcador de posición como contacto sería peor que no tener el archivo.
  if (pendingFields().includes("security.email")) return new Response("Not found", { status: 404 });
  return new Response(securityTxt(new Date(), LEGAL.security.email, LEGAL.site), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

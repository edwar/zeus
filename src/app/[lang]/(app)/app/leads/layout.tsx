import { Suspense } from "react";
import { requirePerm } from "@/lib/access";

// Seguimiento de contactos: lo atienden quienes ven solicitudes (permiso "quotes"); el resto vuelve a su pantalla de inicio.
async function Guard({ params, children }: { params: Promise<{ lang: string }>; children: React.ReactNode }) {
  const { lang } = await params;
  await requirePerm(lang, "quotes");
  return children;
}

export default function Layout({ params, children }: { params: Promise<{ lang: string }>; children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Guard params={params}>{children}</Guard>
    </Suspense>
  );
}

import { Suspense } from "react";
import { requirePerm } from "@/lib/access";

// Inventario y costos: solo quienes tienen el permiso "stock" (admin y gestión); el resto vuelve a su pantalla de inicio.
async function Guard({ params, children }: { params: Promise<{ lang: string }>; children: React.ReactNode }) {
  const { lang } = await params;
  await requirePerm(lang, "stock");
  return children;
}

export default function Layout({ params, children }: { params: Promise<{ lang: string }>; children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Guard params={params}>{children}</Guard>
    </Suspense>
  );
}

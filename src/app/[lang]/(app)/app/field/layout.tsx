import { Suspense } from "react";
import { requirePerm } from "@/lib/access";

// Modo campo: quien puede reportar avance (equipo, gestión y administración).
async function Guard({ params, children }: { params: Promise<{ lang: string }>; children: React.ReactNode }) {
  const { lang } = await params;
  await requirePerm(lang, "projects.progress");
  return children;
}

export default function Layout({ params, children }: { params: Promise<{ lang: string }>; children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Guard params={params}>{children}</Guard>
    </Suspense>
  );
}

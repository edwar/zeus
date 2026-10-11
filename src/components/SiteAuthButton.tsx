import { Suspense } from "react";
import Link from "next/link";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";

async function Cta({ lang, t }: { lang: Locale; t: Dict }) {
  const session = await getSession();
  return (
    <Button asChild variant="sun" size="sm" className="sitenav__cta">
      <Link href={`/${lang}/app`} prefetch={false}>{session ? t.nav.platformOpen : t.nav.signIn}</Link>
    </Button>
  );
}

/** Lleva a /app: "Ingresar" sin sesión, "Ir a la plataforma" con sesión. La sesión se lee dentro de Suspense para no volver dinámica la página. */
export function SiteAuthButton({ lang, t }: { lang: Locale; t: Dict }) {
  return (
    <Suspense
      fallback={
        <Button asChild variant="sun" size="sm" className="sitenav__cta">
          <Link href={`/${lang}/app`} prefetch={false}>{t.nav.signIn}</Link>
        </Button>
      }
    >
      <Cta lang={lang} t={t} />
    </Suspense>
  );
}

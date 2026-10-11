import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { UsersManager } from "@/components/UsersManager";
import { getSession } from "@/lib/session";

async function AdminOnly({ lang }: { lang: "es" | "en" }) {
  const session = await getSession();
  // La sección ya la protege su layout (permiso "users"); aquí solo hace falta el id del usuario actual.
  if (!session) notFound();
  return <UsersManager t={getDict(lang)} currentUserId={session.user.id} />;
}

export default async function Page({ params }: PageProps<"/[lang]/app/users">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <Suspense fallback={null}>
      <AdminOnly lang={lang} />
    </Suspense>
  );
}

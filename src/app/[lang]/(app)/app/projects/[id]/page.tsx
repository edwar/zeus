import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { ProjectDetail } from "@/components/ProjectDetail";

// `params` se lee dentro de Suspense para que la navegación hacia aquí pueda ser instantánea.
export default function Page({ params }: PageProps<"/[lang]/app/projects/[id]">) {
  return (
    <Suspense fallback={<div className="pb" aria-busy="true" />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/[lang]/app/projects/[id]">, "params">) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();
  return <ProjectDetail t={getDict(lang)} lang={lang} id={id} />;
}

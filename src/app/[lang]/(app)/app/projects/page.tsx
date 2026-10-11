import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDict } from "@/i18n";
import { ProjectBoard } from "@/components/ProjectBoard";

export default async function Page({ params }: PageProps<"/[lang]/app/projects">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <ProjectBoard t={getDict(lang)} lang={lang} />;
}

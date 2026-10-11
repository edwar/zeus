// Vuelve a copiar al almacenamiento actual las imágenes cuyo `url` apunta a otro servicio (p. ej. el Vercel Blob
// suspendido). Usa la URL de origen (`src`) guardada en la base. Reanudable: salta lo que ya está migrado.
//   pnpm db:migrate-images [--limit N]
import "./env";
import { prisma } from "../src/lib/prisma";
import { copyImages } from "../src/lib/sync/autosolar";
import { publicBaseUrl, storageConfigured } from "../src/lib/storage";

type Img = { src: string; url: string };

async function main() {
  if (!storageConfigured()) throw new Error("Faltan las variables STORAGE_*");
  const base = publicBaseUrl();
  const i = process.argv.indexOf("--limit");
  const limit = i > -1 ? Number(process.argv[i + 1]) : Infinity;

  const rows = await prisma.product.findMany({ where: { source: "autosolar" }, select: { id: true, slug: true, images: true }, orderBy: { slug: "asc" } });
  const pending = rows.filter((r) => ((r.images as Img[] | null) ?? []).some((im) => !im.url.startsWith(base)));
  const todo = pending.slice(0, limit);
  console.log(`${pending.length} productos con imágenes por migrar (procesando ${todo.length})`);

  let done = 0, images = 0, lost = 0;
  for (const p of todo) {
    const sources = (p.images as Img[]).map((im) => im.src);
    // `existing = []`: se vuelven a descargar y subir todas; las ya migradas se sobrescriben con la misma clave.
    const fresh = await copyImages(p.slug, sources, []);
    if (fresh.length) {
      await prisma.product.update({ where: { id: p.id }, data: { images: fresh } });
      images += fresh.length;
    }
    lost += sources.length - fresh.length;
    if (++done % 25 === 0 || done === todo.length) console.log(`${done}/${todo.length}  imágenes subidas ${images}  sin recuperar ${lost}`);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());

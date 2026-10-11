// Importa/actualiza el catálogo de Autosolar.
//   pnpm scrape [--limit N]
//   pnpm scrape --only "^(paneles-solares|inversores-)"   (solo esas categorías, sin tocar la corrida en curso)
//   pnpm scrape --missing-images   (solo los productos importados que aún no tienen imágenes copiadas)
import "./env";
import { syncStep, upsertScraped } from "../src/lib/sync/autosolar";
import { discoverProductUrls, scrapeProduct } from "../src/lib/scraper/autosolar";
import { getGlobalCommission } from "../src/lib/settings";
import { categorySlug } from "../src/lib/catalog/classify";
import { storageConfigured } from "../src/lib/storage";
import { prisma } from "../src/lib/prisma";

const i = process.argv.indexOf("--limit");
const limit = i > -1 ? Number(process.argv[i + 1]) : undefined;
if (limit !== undefined && !(limit > 0)) {
  console.error("--limit debe ser un número mayor que 0");
  process.exit(1);
}
if (!storageConfigured()) console.warn("Sin STORAGE_*: se omiten las imágenes.");

const o = process.argv.indexOf("--only");
const only = o > -1 ? new RegExp(process.argv[o + 1]) : null;

async function importOnly(re: RegExp) {
  const urls = (await discoverProductUrls()).filter((u) => re.test(categorySlug(u) ?? ""));
  const pct = await getGlobalCommission();
  console.log(`${urls.length} URLs en las categorías pedidas`);
  let created = 0, updated = 0, skipped = 0, failed = 0;
  for (const [i, url] of urls.entries()) {
    try {
      const p = await scrapeProduct(url);
      if (!p) skipped++;
      else if ((await upsertScraped(p, pct)) === "created") created++;
      else updated++;
    } catch (e) {
      failed++;
      console.warn(`Falló ${url}: ${(e as Error).message}`);
    }
    if ((i + 1) % 20 === 0 || i + 1 === urls.length) console.log(`${i + 1}/${urls.length}  nuevos ${created}  actualizados ${updated}  sin precio ${skipped}  fallidos ${failed}`);
  }
}

async function importMissingImages() {
  const rows = await prisma.product.findMany({ where: { source: "autosolar", sourceUrl: { not: null } }, select: { sourceUrl: true, images: true } });
  const urls = rows.filter((r) => !Array.isArray(r.images) || r.images.length === 0).map((r) => r.sourceUrl as string);
  console.log(`${urls.length} productos sin imágenes`);
  const pct = await getGlobalCommission();
  let done = 0, withImages = 0;
  for (const url of urls) {
    try {
      const p = await scrapeProduct(url);
      if (p) {
        await upsertScraped(p, pct);
        const after = await prisma.product.findUnique({ where: { sourceUrl: url }, select: { images: true } });
        if (Array.isArray(after?.images) && after.images.length) withImages++;
      }
    } catch (e) {
      console.warn(`Falló ${url}: ${(e as Error).message}`);
    }
    if (++done % 20 === 0 || done === urls.length) console.log(`${done}/${urls.length}  con imágenes ahora: ${withImages}`);
  }
}

async function main() {
  if (process.argv.includes("--missing-images")) return importMissingImages();
  if (only) return importOnly(only);
  for (;;) {
    const s = await syncStep({ size: 10, limit });
    console.log(`${s.cursor}/${s.total}  nuevos ${s.created}  actualizados ${s.updated}  fallidos ${s.failed}`);
    if (s.done) break;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

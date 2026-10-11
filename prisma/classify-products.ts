// Rellena kind/potencia/capacidad/voltaje/fases/pack de los productos de Autosolar ya importados
// y muestra qué categorías dan kits y cuántos productos quedaron sin potencia.
//   pnpm db:classify
import "./env";
import { prisma } from "../src/lib/prisma";
import { classifyProduct, categorySlug } from "../src/lib/catalog/classify";
import type { Spec } from "../src/lib/scraper/autosolar";

async function main() {
  const items = await prisma.product.findMany({ where: { source: "autosolar" } });
  let changed = 0;
  for (const p of items) {
    const c = classifyProduct({ name: p.name, sourceUrl: p.sourceUrl, specs: (p.specs as Spec[] | null) ?? [] });
    const same = p.kind === c.kind && p.powerW === c.powerW && p.capacityWh === c.capacityWh && p.voltageV === c.voltageV && p.phases === c.phases && p.packQty === c.packQty;
    if (!same) {
      await prisma.product.update({ where: { id: p.id }, data: c });
      changed++;
    }
  }
  console.log(`${items.length} productos revisados, ${changed} actualizados.\n`);

  const all = await prisma.product.findMany({ where: { source: "autosolar" }, select: { kind: true, powerW: true, capacityWh: true, voltageV: true, name: true, sourceUrl: true, active: true } });
  for (const kind of ["panel", "inverter_ongrid", "inverter_hybrid", "battery", "structure"] as const) {
    const g = all.filter((x) => x.kind === kind);
    const missing = g.filter((x) => (kind === "battery" ? !x.capacityWh || !x.voltageV : kind === "structure" ? false : !x.powerW));
    console.log(`${kind.padEnd(16)} ${String(g.length).padStart(4)} productos, ${missing.length} sin dato clave`);
    for (const m of missing.slice(0, 5)) console.log(`   · ${m.name} (${categorySlug(m.sourceUrl)})`);
  }
  console.log(`\nother: ${all.filter((x) => x.kind === "other").length}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());

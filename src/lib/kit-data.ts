import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "./prisma";
import { CATALOG_TAG } from "./catalog";
import type { KitProduct } from "./kit";
import type { ProductKind } from "./catalog/classify";

const KINDS: ProductKind[] = ["panel", "inverter_ongrid", "inverter_hybrid", "battery", "structure", "cable_dc", "connector", "terminal", "battery_cable", "cabinet", "rack_tray", "monitoring", "electrical_kit"];

/** Productos que pueden entrar a un kit: visibles, con precio, disponibles y clasificados. Se invalida con el catálogo. */
export async function loadKitCatalog(): Promise<KitProduct[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const rows = await prisma.product.findMany({
    // Disponible = el proveedor lo tiene, o hay unidades en el inventario propio (y un producto manual con inventario se agota en 0)
    where: {
      active: true, price: { gt: 0 }, kind: { in: KINDS },
      OR: [{ inStock: true, stock: null }, { inStock: true, source: "autosolar" }, { stock: { is: { onHand: { gt: 0 } } } }],
    },
    include: { manufacturer: { select: { name: true } } },
  });
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    manufacturer: p.manufacturer.name,
    category: p.category,
    kind: p.kind,
    powerW: p.powerW,
    capacityWh: p.capacityWh,
    voltageV: p.voltageV,
    phases: p.phases,
    packQty: p.packQty,
    price: Number(p.price),
    image: ((p.images as { url: string }[] | null) ?? [])[0]?.url ?? null,
  }));
}

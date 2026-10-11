import { z } from "zod";
import { buildKit, buildOptions } from "@/lib/kit";
import { loadKitCatalog } from "@/lib/kit-data";
import { tooLarge } from "@/lib/http";
import { EXTRA_KEYS } from "@/lib/install-kit";

const body = z.object({
  systemType: z.enum(["ongrid", "hybrid", "offgrid"]),
  phases: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
  targetKwp: z.number().min(0.2).max(500),
  backupKw: z.number().min(0).max(100).optional(),
  backupNominalKwh: z.number().min(0).max(500).optional(),
  options: z.boolean().optional(),
  selection: z
    .object({
      panelId: z.string().max(40).optional(),
      panelQty: z.number().int().min(1).max(2000).optional(),
      inverterId: z.string().max(40).optional(),
      batteryId: z.string().max(40).optional(),
      structureId: z.string().max(40).optional(),
      extras: z.partialRecord(z.enum(EXTRA_KEYS), z.string().max(40)).optional(),
    })
    .optional(),
});

/** Candidatos por componente para la potencia pedida; cada cambio de selección recalcula lo que depende de ella. */
export async function POST(req: Request) {
  const big = tooLarge(req, 5_000);
  if (big) return big;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  const catalog = await loadKitCatalog();
  return Response.json(parsed.data.options ? buildOptions(catalog, parsed.data) : buildKit(catalog, parsed.data));
}

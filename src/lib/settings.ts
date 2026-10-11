import { prisma } from "./prisma";

const ID = "default";

/** Comisión global (%). Crea la fila única en el primer uso. */
export async function getGlobalCommission(): Promise<number> {
  const row = await prisma.storeSettings.upsert({ where: { id: ID }, update: {}, create: { id: ID } });
  return Number(row.commissionPct);
}

export async function setGlobalCommission(pct: number): Promise<number> {
  const row = await prisma.storeSettings.upsert({
    where: { id: ID },
    update: { commissionPct: pct },
    create: { id: ID, commissionPct: pct },
  });
  return Number(row.commissionPct);
}

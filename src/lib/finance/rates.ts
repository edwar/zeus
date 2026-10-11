import { cacheLife } from "next/cache";
import { type BankRate, type RateRow, parsePct, termBucket, usuryFromIbc, weightedByEntity } from "./rates-core";

// Datos abiertos de la Superintendencia Financiera de Colombia en datos.gov.co (Socrata). Ninguno es una oferta de un banco.
const HOST = "https://www.datos.gov.co/resource";
const ACTIVE_RATES = "qzsc-9esp"; // Tasas de interés activas por tipo de crédito – últimos dos meses
const TIBC = "pare-7x5i"; // Tasa de interés bancario corriente (base de la usura)

async function soda<T>(dataset: string, params: Record<string, string>): Promise<T> {
  const url = `${HOST}/${dataset}.json?${new URLSearchParams(params)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`datos.gov.co ${dataset}: ${res.status}`);
  return (await res.json()) as T;
}

export type UsuryInfo = { ibcEA: number; usuryEA: number; from: string; to: string; resolution: string };

/** Tope legal vigente para créditos de consumo: 1,5 × interés bancario corriente de "Consumo y ordinario". */
export async function currentUsury(): Promise<UsuryInfo | null> {
  "use cache";
  cacheLife("hours");
  const today = new Date().toISOString().slice(0, 10);
  const rows = await soda<{ interes_bancario_corriente: string; vigencia_desde: string; vigencia_hasta: string; resolucion: string }[]>(TIBC, {
    $where: `modalidad='CONSUMO Y ORDINARIO' AND vigencia_desde<='${today}T00:00:00' AND vigencia_hasta>='${today}T00:00:00'`,
    $order: "vigencia_desde DESC",
    $limit: "1",
  });
  const r = rows[0];
  if (!r) return null;
  const ibc = parsePct(r.interes_bancario_corriente);
  if (!(ibc > 0)) return null;
  return { ibcEA: ibc, usuryEA: usuryFromIbc(ibc), from: r.vigencia_desde.slice(0, 10), to: r.vigencia_hasta.slice(0, 10), resolution: r.resolucion };
}

export type RatesInfo = { banks: BankRate[]; cutoff: string | null };

/** Tasas efectivas promedio de créditos de consumo (libre inversión) desembolsados en los últimos dos meses, por entidad y plazo. */
export async function bankRates(termMonths: number): Promise<RatesInfo> {
  "use cache";
  cacheLife("hours");
  const bucket = termBucket(termMonths);
  const where = `producto_de_cr_dito='Consumo otros' AND tipo_de_persona='Natural' AND plazo_de_cr_dito='${bucket}'`;
  const [rows, cut] = await Promise.all([
    soda<RateRow[]>(ACTIVE_RATES, { $select: "nombre_entidad,nombre_tipo_entidad,tasa_efectiva_promedio,montos_desembolsados,numero_de_creditos", $where: where, $limit: "50000" }),
    soda<{ c: string }[]>(ACTIVE_RATES, { $select: "max(fecha_corte) as c", $where: where }),
  ]);
  return { banks: weightedByEntity(rows), cutoff: cut[0]?.c?.slice(0, 10) ?? null };
}

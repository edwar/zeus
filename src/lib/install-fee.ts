/** Lo que cobra un equipo por instalar un kit: valor base por proyecto + valor por kWp. Sin ninguno de los dos no hay tarifa. */
export type FeeRates = { installBase: number | null; installPerKwp: number | null };

export function installFee(rates: FeeRates, kwp: number): number | null {
  if (rates.installBase == null && rates.installPerKwp == null) return null;
  const raw = (rates.installBase ?? 0) + (rates.installPerKwp ?? 0) * Math.max(0, kwp);
  return Math.round(raw / 100) * 100; // al centenar, como los precios del catálogo
}

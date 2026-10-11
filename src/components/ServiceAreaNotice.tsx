"use client";

import type { Dict } from "@/i18n";
import { useCoverage } from "@/hooks/useCoverage";

/** Dice al cliente si hay un equipo que instale en su zona o si solo se le vende el kit. */
export function ServiceAreaNotice({ t, lat, lon }: { t: Dict; lat: string; lon: string }) {
  const s = t.wiz.service;
  const { data, isPending, isError } = useCoverage(lat, lon);
  if (lat === "" || lon === "") return <p className="wiz__hint">{s.unknown}</p>;
  if (isPending || isError || !data) return <p className="wiz__hint" aria-live="polite">{isError ? s.unknown : s.checking}</p>;
  const kind = data.covered ? "install" : "kit_only";
  return (
    <p className={`wiz__service wiz__service--${kind}`} role="status">
      <strong>{data.covered ? s.installTitle : s.kitOnlyTitle}</strong> {data.covered ? s.install : s.kitOnly}
    </p>
  );
}

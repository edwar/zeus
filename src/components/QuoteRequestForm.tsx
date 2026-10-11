"use client";

import { hasBattery } from "@/lib/sizing";
import { useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { Sizing } from "@/lib/sizing";
import type { ReviewValues } from "@/lib/wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCoverage } from "@/hooks/useCoverage";
import { ServiceAreaNotice } from "@/components/ServiceAreaNotice";
import { PhoneField } from "@/components/PhoneField";

export type QuoteLine = { productId: string; qty: number; name: string; unitPrice: number };

type Props = {
  t: Dict;
  lang: Locale;
  lines: QuoteLine[];
  values: ReviewValues;
  sizing: Sizing;
  total: number;
  financing?: { downPct: number; termMonths: number; rateEA: number; entity: string | null };
  disabled: boolean;
  onSent: (id: string, total: number, fulfillment: string) => void;
};

const num = (s: string) => Number(s.replace(",", "."));
const orNull = (s: string) => s.trim() || null;

export function QuoteRequestForm({ t, lang, lines, values: v, sizing, financing, disabled, onSent }: Props) {
  const s = t.wiz.send;
  const uid = useId().replace(/:/g, "");
  const [error, setError] = useState("");
  const [choice, setChoice] = useState<"zeus" | "own">("zeus");
  const coverage = useCoverage(v.lat, v.lon);

  const send = useMutation({
    mutationFn: async (contact: { name: string; email: string; phone: string; city: string | null }) => {
      const tariff = num(v.tariff);
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact,
          consent: true,
          installerChoice: coverage.data?.covered ? choice : undefined,
          financing: financing && { ...financing, rateEA: Math.round(financing.rateEA * 100) / 100 },
          systemType: v.systemType,
          bill: {
            monthlyKwh: num(v.monthlyKwh),
            tariff: Number.isFinite(tariff) && tariff > 0 ? tariff : null,
            currency: "COP",
            operator: orNull(v.operator),
            // Se envía solo una ubicación aproximada (≈1 km).
            lat: v.lat ? Math.round(Number(v.lat) * 100) / 100 : null,
            lon: v.lon ? Math.round(Number(v.lon) * 100) / 100 : null,
            municipality: orNull(v.municipality),
            department: orNull(v.department),
            estrato: v.estrato ? Number(v.estrato) : null,
            connection: v.connection || null,
            coveragePct: num(v.coveragePct),
            peakSunHours: num(v.peakSunHours),
            ...(hasBattery(v.systemType) ? { backupKw: num(v.backupKw), autonomyHours: num(v.autonomyHours) } : {}),
          },
          sizing: { kwp: sizing.kwp, monthlySolarKwh: sizing.monthlySolarKwh, monthlySavings: sizing.monthlySavings, batteryNominalKwh: sizing.batteryNominalKwh },
          items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        }),
      });
      if (!res.ok) throw Object.assign(new Error(String(res.status)), { status: res.status });
      return (await res.json()) as { id: string; total: number; fulfillment: string };
    },
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError("");
    send.mutate(
      { name: String(f.get("name")).trim(), email: String(f.get("email")).trim(), phone: String(f.get("phone")).trim(), city: orNull(String(f.get("city") ?? "")) },
      {
        onSuccess: (r) => onSent(r.id, r.total, r.fulfillment),
        onError: (err) => setError((err as { status?: number }).status === 429 ? s.errorRate : s.errorGeneric),
      },
    );
  }

  return (
    <form className="wiz__contact" onSubmit={onSubmit}>
      <h3>{s.title}</h3>
      <p className="wiz__hint">{s.sub}</p>
      <div className="wiz__grid2">
        <div className="field"><label htmlFor={`${uid}n`}>{s.name}</label><Input id={`${uid}n`} name="name" autoComplete="name" required minLength={2} maxLength={120} /></div>
        <div className="field"><label htmlFor={`${uid}c`}>{s.city}</label><Input id={`${uid}c`} name="city" autoComplete="address-level2" maxLength={80} defaultValue={v.municipality} /></div>
        <div className="field"><label htmlFor={`${uid}e`}>{s.email}</label><Input id={`${uid}e`} name="email" type="email" autoComplete="email" required maxLength={160} /></div>
        <PhoneField name="phone" label={s.phone} countryLabel={s.country} lang={lang} />
      </div>
      <ServiceAreaNotice t={t} lat={v.lat} lon={v.lon} />
      {coverage.data?.covered && (
        <fieldset className="wiz__choice">
          <legend>{t.wiz.service.choiceTitle}</legend>
          {(["zeus", "own"] as const).map((k) => (
            <label key={k} className={choice === k ? "is-on" : ""}>
              <input type="radio" name="installer" value={k} checked={choice === k} onChange={() => setChoice(k)} />
              <span><strong>{k === "zeus" ? t.wiz.service.choiceZeus : t.wiz.service.choiceOwn}</strong><small>{k === "zeus" ? t.wiz.service.choiceZeusHint : t.wiz.service.choiceOwnHint}</small></span>
            </label>
          ))}
        </fieldset>
      )}
      {financing && <p className="wiz__hint">{t.wiz.finance.attached}</p>}
      <label className="wiz__consent"><input type="checkbox" required /> {s.consent}</label>
      <p className="field-error" role="alert" hidden={!error}>{error}</p>
      <div className="wiz__actions">
        <Button type="submit" disabled={send.isPending || disabled}>{send.isPending ? s.sending : t.wiz.kit.request}</Button>
      </div>
    </form>
  );
}

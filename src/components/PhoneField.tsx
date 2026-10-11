"use client";

import { useId, useMemo, useState } from "react";
import { COUNTRIES, flag, splitPhone, toE164 } from "@/lib/phone";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Envía el teléfono completo en E.164 (+57300…) en un campo oculto con el nombre dado.
export function PhoneField({ name, label, countryLabel, lang, defaultValue }: { name: string; label: string; countryLabel: string; lang: string; defaultValue?: string }) {
  const uid = useId().replace(/:/g, "");
  const initial = useMemo(() => splitPhone(defaultValue), [defaultValue]);
  const [iso, setIso] = useState(initial.iso);
  const [national, setNational] = useState(initial.national);
  const names = useMemo(() => new Intl.DisplayNames([lang], { type: "region" }), [lang]);
  const dial = COUNTRIES.find((c) => c.iso === iso)?.dial ?? "57";

  return (
    <div className="field">
      <label htmlFor={`${uid}p`}>{label}</label>
      <div className="phone">
        <Select value={iso} onValueChange={setIso}>
          <SelectTrigger aria-label={countryLabel} className="phone__country w-32! shrink-0">
            <SelectValue>{flag(iso)} +{dial}</SelectValue>
          </SelectTrigger>
          <SelectContent className="min-w-72">
            {COUNTRIES.map((c) => (
              <SelectItem key={c.iso} value={c.iso}>{flag(c.iso)} {names.of(c.iso)} +{c.dial}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={`${uid}p`}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required
          minLength={6}
          maxLength={15}
          pattern="[0-9 ]{6,15}"
          value={national}
          onChange={(e) => setNational(e.target.value.replace(/[^\d ]/g, ""))}
        />
      </div>
      <input type="hidden" name={name} value={toE164(dial, national)} />
    </div>
  );
}

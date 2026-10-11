"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { enUS, es } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toIso = (d: Date) => d.toLocaleDateString("sv-SE"); // AAAA-MM-DD en hora local

/** Selector de fecha (calendario de shadcn). El valor es una fecha ISO "AAAA-MM-DD". */
export function DatePicker({ id, value, onChange, lang, min, placeholder }: { id?: string; value: string; onChange: (iso: string) => void; lang: string; min?: string; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const selected = value ? toDate(value) : undefined;
  const label = selected ? new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric" }).format(selected) : placeholder;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" className="w-full justify-start gap-2 font-normal" data-empty={!selected}>
          <CalendarIcon aria-hidden="true" />
          <span>{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          locale={lang === "en" ? enUS : es}
          weekStartsOn={1}
          disabled={min ? { before: toDate(min) } : undefined}
          onSelect={(d) => { if (d) { onChange(toIso(d)); setOpen(false); } }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

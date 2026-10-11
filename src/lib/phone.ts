// Teléfonos en formato internacional (E.164): "+57" + número nacional, para abrir WhatsApp con un clic.
export type Country = { iso: string; dial: string };

// Colombia primero (mercado principal); el resto por región.
export const COUNTRIES: Country[] = [
  { iso: "CO", dial: "57" }, { iso: "VE", dial: "58" }, { iso: "EC", dial: "593" }, { iso: "PE", dial: "51" },
  { iso: "PA", dial: "507" }, { iso: "MX", dial: "52" }, { iso: "US", dial: "1" }, { iso: "ES", dial: "34" },
  { iso: "AR", dial: "54" }, { iso: "BO", dial: "591" }, { iso: "BR", dial: "55" }, { iso: "CL", dial: "56" },
  { iso: "CR", dial: "506" }, { iso: "CU", dial: "53" }, { iso: "DO", dial: "1" }, { iso: "SV", dial: "503" },
  { iso: "GT", dial: "502" }, { iso: "HN", dial: "504" }, { iso: "NI", dial: "505" }, { iso: "PY", dial: "595" },
  { iso: "UY", dial: "598" }, { iso: "CA", dial: "1" }, { iso: "FR", dial: "33" }, { iso: "DE", dial: "49" },
  { iso: "IT", dial: "39" }, { iso: "PT", dial: "351" }, { iso: "GB", dial: "44" },
];

export const flag = (iso: string) => String.fromCodePoint(...[...iso].map((c) => 0x1f1a5 + c.charCodeAt(0)));

export const E164 = /^\+[1-9]\d{7,14}$/;

export function toE164(dial: string, national: string): string {
  const digits = national.replace(/\D/g, "").replace(/^0+/, "");
  return `+${dial}${digits}`;
}

/** Separa un E.164 en país y número nacional para editarlo. Por defecto Colombia. */
export function splitPhone(phone?: string): { iso: string; national: string } {
  if (!phone || !E164.test(phone)) return { iso: "CO", national: "" };
  const c = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((x) => phone.slice(1).startsWith(x.dial));
  return c ? { iso: c.iso, national: phone.slice(1 + c.dial.length) } : { iso: "CO", national: "" };
}

export function whatsappUrl(phone: string): string | null {
  return E164.test(phone) ? `https://wa.me/${phone.slice(1)}` : null;
}

export function formatPhone(phone: string): string {
  if (!E164.test(phone)) return phone;
  const c = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((x) => phone.slice(1).startsWith(x.dial));
  if (!c) return phone;
  const rest = phone.slice(1 + c.dial.length);
  // 10 dígitos (CO, MX, US…): 3-3-4; otros largos: bloques de 3 desde el final.
  const grouped = rest.length === 10 ? rest.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3") : rest.replace(/(?=(\d{3})+$)/g, " ").trim();
  return `+${c.dial} ${grouped}`;
}

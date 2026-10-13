/**
 * Datos del responsable del tratamiento y plazos que aparecen en la política de privacidad y en la de seguridad.
 *
 * Todo lo que empieza por «[POR COMPLETAR» es algo que solo el responsable puede decidir o conocer (razón social, NIT,
 * correo de contacto, plazos). Mientras quede alguno, las páginas lo muestran resaltado y `pnpm legal:check` falla:
 * no se debe publicar con valores pendientes. Reemplázalos aquí; no hay que tocar los textos.
 */
export const PENDING = "[POR COMPLETAR";

const todo = (what: string) => `${PENDING}: ${what}]`;

export const LEGAL = {
  /** Versión del documento y fecha de la última actualización (YYYY-MM-DD). Súbela cuando cambie el contenido. */
  version: "1.5",
  updated: "2026-10-12",

  controller: {
    /** Persona natural o jurídica responsable de las bases de datos. */
    name: "Edwar Orlando Amaya Diaz",
    /** NIT o documento de identidad. */
    id: "C.C. 1075627303",
    address: "Calle 1 # 11-30",
    city: "Tocaima, Cundinamarca, Colombia",
    phone: "+57 317 522 7672",
    /** Canal oficial para consultas y reclamos sobre datos personales (derechos de los titulares). */
    privacyEmail: "edwaramayadiaz@gmail.com",
    /** Persona o área que atiende las solicitudes de los titulares. */
    privacyOwner: "Edwar Orlando Amaya Diaz",
  },

  security: {
    /** Correo para reportar vulnerabilidades (también se publica en /.well-known/security.txt). */
    email: "edwaramayadiaz@gmail.com",
    /** Plazo (días hábiles) en que se compromete a acusar recibo de un reporte. */
    ackBusinessDays: "3",
  },

  /** Cuánto se conservan los datos (por idioma). Decisión del responsable; la ley exige que sea el necesario para la finalidad. */
  retention: {
    quotes: { es: "durante 24 meses desde la última interacción", en: "for 24 months from the last interaction" },
    accounts: { es: "durante 12 meses después de la baja de la cuenta", en: "for 12 months after the account is closed" },
  },

  site: "https://zeus.cognilab.dev",
} as const;

/** Rutas («a.b.c») de los valores que siguen pendientes. */
export function pendingFields(obj: Record<string, unknown> = LEGAL, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") return v.startsWith(PENDING) ? [path] : [];
    if (v && typeof v === "object") return pendingFields(v as Record<string, unknown>, path);
    return [];
  });
}

/** Valores listos para `fill()` dentro de los textos: {name}, {id}, {address}… */
export const legalVars = (lang: "es" | "en" = "es"): Record<string, string> => ({
  name: LEGAL.controller.name,
  id: LEGAL.controller.id,
  address: LEGAL.controller.address,
  city: LEGAL.controller.city,
  phone: LEGAL.controller.phone,
  privacyEmail: LEGAL.controller.privacyEmail,
  privacyOwner: LEGAL.controller.privacyOwner,
  securityEmail: LEGAL.security.email,
  ackDays: LEGAL.security.ackBusinessDays,
  retentionQuotes: LEGAL.retention.quotes[lang],
  retentionAccounts: LEGAL.retention.accounts[lang],
  site: LEGAL.site,
  version: LEGAL.version,
});

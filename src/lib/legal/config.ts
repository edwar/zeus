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
  version: "1.0",
  updated: "2026-10-12",

  controller: {
    /** Persona natural o jurídica responsable de las bases de datos. */
    name: todo("razón social o nombre completo del responsable"),
    /** NIT o documento de identidad. */
    id: todo("NIT o documento de identidad"),
    address: todo("dirección física del responsable"),
    city: todo("ciudad y país"),
    phone: todo("teléfono de contacto (opcional)"),
    /** Canal oficial para consultas y reclamos sobre datos personales (derechos de los titulares). */
    privacyEmail: todo("correo para consultas y reclamos de datos personales"),
    /** Persona o área que atiende las solicitudes de los titulares. */
    privacyOwner: todo("persona o área que atiende las solicitudes (p. ej. «Atención al titular»)"),
  },

  security: {
    /** Correo para reportar vulnerabilidades (también se publica en /.well-known/security.txt). */
    email: todo("correo para reportar vulnerabilidades"),
    /** Plazo (días hábiles) en que se compromete a acusar recibo de un reporte. */
    ackBusinessDays: todo("días hábiles para acusar recibo (p. ej. 3)"),
  },

  /** Cuánto se conservan los datos. Decisión del responsable; la ley exige que sea el necesario para la finalidad. */
  retention: {
    quotes: todo("meses de conservación de solicitudes y cotizaciones"),
    accounts: todo("plazo de conservación de cuentas del equipo tras su baja"),
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
export const legalVars = (): Record<string, string> => ({
  name: LEGAL.controller.name,
  id: LEGAL.controller.id,
  address: LEGAL.controller.address,
  city: LEGAL.controller.city,
  phone: LEGAL.controller.phone,
  privacyEmail: LEGAL.controller.privacyEmail,
  privacyOwner: LEGAL.controller.privacyOwner,
  securityEmail: LEGAL.security.email,
  ackDays: LEGAL.security.ackBusinessDays,
  retentionQuotes: LEGAL.retention.quotes,
  retentionAccounts: LEGAL.retention.accounts,
  site: LEGAL.site,
  version: LEGAL.version,
});

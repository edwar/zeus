import type { LegalDoc } from "./types";

/**
 * Política de seguridad. Cada medida listada existe en el código (cabeceras en next.config.ts, límites en auth.ts y
 * ratelimit.ts, permisos en roles.ts); no se afirma nada que no se pueda comprobar. Si se quita o cambia una medida,
 * hay que corregir este texto.
 */
const es: LegalDoc = {
  title: "Seguridad",
  description: "Cómo protege Zeus los datos de clientes y del equipo, y cómo reportar una vulnerabilidad de forma responsable.",
  intro: "Cuidar tus datos es parte del servicio. Esta página explica qué medidas aplicamos, qué límites tienen y cómo puedes avisarnos si encuentras un problema.",
  updatedLabel: "Última actualización",
  versionLabel: "Versión",
  tocLabel: "En esta página",
  sections: [
    {
      id: "medidas",
      title: "1. Cómo protegemos los datos",
      body: [
        {
          list: [
            "Conexión cifrada: el sitio solo se sirve por HTTPS y ordena a los navegadores no volver a usar HTTP (HSTS, 2 años).",
            "Cabeceras de seguridad: política de contenido (CSP) que limita desde dónde se puede cargar código, imágenes y conexiones; bloqueo de que otras páginas incrusten el sitio; y control de lo que se comparte al navegar.",
            "Contraseñas: nunca se guardan en claro, solo un hash que no se puede revertir; mínimo 10 caracteres. No hay registro público: solo un administrador crea cuentas.",
            "Sesiones: cookie de sesión con atributos Secure (solo por HTTPS) y HttpOnly (inaccesible desde scripts), y protección contra solicitudes desde otros sitios (CSRF).",
            "Límite de intentos: se bloquean los intentos repetidos de inicio de sesión (5 por minuto) y el abuso de los formularios públicos (por ejemplo, un máximo de solicitudes de cotización por hora desde una misma conexión).",
            "Permisos mínimos: cada rol ve solo lo que necesita y se comprueba siempre en el servidor, no solo en la pantalla. Una cuadrilla solo ve los proyectos de su equipo y no ve precios del cliente ni solicitudes.",
            "Validación de datos: toda la información que llega al servidor se valida antes de usarla.",
            "Trazabilidad: los cambios de estado de una solicitud quedan registrados con quién los hizo y cuándo.",
            "Secretos fuera del código: las claves y credenciales viven en variables de entorno del proveedor, no en el repositorio.",
          ],
        },
      ],
    },
    {
      id: "no-guardamos",
      title: "2. Datos que no guardamos",
      body: [
        {
          list: [
            "La factura que subes: se usa para leer el consumo y la tarifa y no se almacena.",
            "Tu dirección IP en las solicitudes públicas: guardamos solo un código derivado de ella (hash con sal) para limitar abusos. Para el personal, las sesiones sí registran la IP y el navegador.",
            "Datos de tarjetas o pagos: el sitio no los pide.",
          ],
        },
      ],
    },
    {
      id: "proveedores",
      title: "3. Infraestructura y proveedores",
      body: [
        "El sitio se aloja en Vercel y la base de datos en Neon (sobre Amazon Web Services). La lectura de facturas usa un proveedor de modelos de IA a través de Vercel AI Gateway. Elegimos proveedores con prácticas de seguridad publicadas, incluido el cifrado de los datos en reposo, según sus propias políticas; esas garantías son de cada proveedor y puedes consultarlas en sus sitios.",
        "Detalle de qué datos recibe cada uno en nuestra [política de privacidad](/privacy#terceros).",
      ],
    },
    {
      id: "incidentes",
      title: "4. Si ocurre un incidente",
      body: ["Si detectamos un incidente que afecte datos personales, lo contendremos, investigaremos qué ocurrió y lo informaremos a la Superintendencia de Industria y Comercio y a las personas afectadas en los casos y plazos que exige la ley."],
    },
    {
      id: "reportar",
      title: "5. Reportar una vulnerabilidad",
      body: [
        "Si crees haber encontrado una falla de seguridad, escríbenos a {securityEmail}. Nos comprometemos a acusar recibo en {ackDays} días hábiles y a mantenerte informado hasta resolverla. También publicamos estos datos en [/.well-known/security.txt](/.well-known/security.txt).",
        "Para ayudarnos a corregirla, incluye:",
        { list: ["Una descripción del problema y su impacto.", "Los pasos para reproducirlo (URL, datos de prueba, capturas).", "Cómo podemos contactarte."] },
        "Te pedimos actuar de buena fe:",
        {
          list: [
            "No accedas, modifiques ni borres datos de otras personas; si encuentras datos personales, deja de probar y avísanos.",
            "No hagas pruebas que degraden el servicio (denegación de servicio, envío masivo de solicitudes) ni ingeniería social contra el personal.",
            "Dame un plazo razonable para corregir antes de divulgar públicamente el problema.",
            "Quedan fuera de alcance las fallas de servicios de terceros (Vercel, Neon, OpenStreetMap, etc.): repórtalas a sus responsables.",
          ],
        },
        "Si actúas así, no emprenderemos acciones legales contra ti por la investigación.",
      ],
    },
    {
      id: "limites",
      title: "6. Lo que debes saber",
      body: ["Ningún sistema es completamente seguro. Revisamos y mejoramos estas medidas de forma continua, y actualizamos esta página cuando cambian. Para saber cómo tratamos tus datos personales, consulta la [política de privacidad](/privacy)."],
    },
  ],
};

const en: LegalDoc = {
  title: "Security",
  description: "How Zeus protects customer and staff data, and how to report a vulnerability responsibly.",
  intro: "Taking care of your data is part of the service. This page explains which measures we apply, what their limits are and how you can tell us if you find a problem.",
  updatedLabel: "Last updated",
  versionLabel: "Version",
  tocLabel: "On this page",
  notice: "Courtesy translation. The Spanish version is the authoritative text and prevails in case of any discrepancy.",
  sections: [
    {
      id: "medidas",
      title: "1. How we protect data",
      body: [
        {
          list: [
            "Encrypted connection: the site is only served over HTTPS and tells browsers never to fall back to HTTP (HSTS, 2 years).",
            "Security headers: a content security policy (CSP) limiting where code, images and connections can load from; blocking other pages from embedding the site; and control over what is shared when navigating.",
            "Passwords: never stored in plain text, only a hash that cannot be reversed; minimum 10 characters. There is no public sign-up: only an administrator creates accounts.",
            "Sessions: a session cookie with the Secure (HTTPS only) and HttpOnly (not readable by scripts) attributes, and protection against requests from other sites (CSRF).",
            "Attempt limits: repeated sign-in attempts are blocked (5 per minute) and abuse of public forms is limited (for example, a maximum of quote requests per hour from one connection).",
            "Least privilege: each role sees only what it needs and this is always enforced on the server, not just on screen. A crew only sees its own team's projects and cannot see customer prices or requests.",
            "Data validation: everything that reaches the server is validated before use.",
            "Traceability: status changes on a request are logged with who made them and when.",
            "Secrets outside the code: keys and credentials live in the provider's environment variables, not in the repository.",
          ],
        },
      ],
    },
    {
      id: "no-guardamos",
      title: "2. Data we do not store",
      body: [
        {
          list: [
            "The bill you upload: it is used to read consumption and tariff and is not stored.",
            "Your IP address on public requests: we only keep a code derived from it (salted hash) to limit abuse. For staff, sessions do record the IP and browser.",
            "Card or payment data: the site does not ask for it.",
          ],
        },
      ],
    },
    {
      id: "proveedores",
      title: "3. Infrastructure and providers",
      body: [
        "The site is hosted on Vercel and the database on Neon (on Amazon Web Services). Bill reading uses an AI model provider through Vercel AI Gateway. We chose providers with published security practices, including encryption of data at rest, according to their own policies; those guarantees are each provider's and you can check them on their sites.",
        "Details on which data each one receives are in our [privacy policy](/privacy#terceros).",
      ],
    },
    {
      id: "incidentes",
      title: "4. If an incident happens",
      body: ["If we detect an incident affecting personal data, we will contain it, investigate what happened and report it to the Superintendence of Industry and Commerce and to the people affected in the cases and within the deadlines required by law."],
    },
    {
      id: "reportar",
      title: "5. Report a vulnerability",
      body: [
        "If you believe you have found a security flaw, write to {securityEmail}. We commit to acknowledging receipt within {ackDays} business days and to keeping you informed until it is resolved. We also publish these details at [/.well-known/security.txt](/.well-known/security.txt).",
        "To help us fix it, include:",
        { list: ["A description of the problem and its impact.", "Steps to reproduce it (URL, test data, screenshots).", "How we can contact you."] },
        "We ask you to act in good faith:",
        {
          list: [
            "Do not access, modify or delete other people's data; if you come across personal data, stop testing and let us know.",
            "Do not run tests that degrade the service (denial of service, mass requests) or social engineering against staff.",
            "Give us a reasonable time to fix the issue before disclosing it publicly.",
            "Flaws in third-party services (Vercel, Neon, OpenStreetMap, etc.) are out of scope: report them to their owners.",
          ],
        },
        "If you act this way, we will not take legal action against you for the research.",
      ],
    },
    {
      id: "limites",
      title: "6. What you should know",
      body: ["No system is completely secure. We review and improve these measures continuously and update this page when they change. To learn how we process your personal data, see the [privacy policy](/privacy)."],
    },
  ],
};

export const security = { es, en } as const;

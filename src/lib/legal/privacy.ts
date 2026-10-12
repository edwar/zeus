import type { LegalDoc } from "./types";

/**
 * Política de tratamiento de datos personales (Ley 1581 de 2012 y Decreto 1377 de 2013, compilado en el Decreto 1074
 * de 2015). Describe lo que la aplicación hace de verdad hoy; si cambia el código (otra analítica, otro proveedor,
 * otra finalidad), hay que actualizar este texto y subir `LEGAL.version`. Debe revisarla un abogado antes de publicarla.
 */
const es: LegalDoc = {
  title: "Política de privacidad y tratamiento de datos personales",
  description: "Qué datos personales recoge Zeus, para qué los usa, con quién los comparte y cómo ejercer tus derechos de habeas data.",
  intro:
    "En Zeus queremos que sepas, sin letra pequeña, qué datos tuyos usamos cuando simulas tu ahorro o pides una cotización, para qué, con quién los compartimos y cómo puedes conocerlos, corregirlos o pedir que los borremos.",
  updatedLabel: "Última actualización",
  versionLabel: "Versión",
  tocLabel: "En esta página",
  sections: [
    {
      id: "responsable",
      title: "1. Quién es el responsable",
      body: [
        "El responsable del tratamiento de tus datos personales es:",
        { list: ["Nombre o razón social: {name}", "NIT o identificación: {id}", "Domicilio: {address}, {city}", "Correo para consultas y reclamos: {privacyEmail}", "Teléfono: {phone}", "Sitio web: {site}"] },
        "Esta política aplica a los datos que recogemos en este sitio web y en la plataforma interna que usa nuestro equipo.",
      ],
    },
    {
      id: "marco",
      title: "2. Marco legal",
      body: [
        "Tratamos tus datos de acuerdo con la Ley 1581 de 2012 (régimen general de protección de datos personales), el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y las instrucciones de la Superintendencia de Industria y Comercio (SIC), que es la autoridad de protección de datos en Colombia.",
      ],
    },
    {
      id: "datos",
      title: "3. Qué datos recogemos",
      body: [
        "Solo recogemos lo necesario para cada paso. Según lo que hagas en el sitio:",
        {
          table: {
            head: ["Quién", "Qué datos", "Cuándo"],
            rows: [
              ["Quien pide una cotización", "Nombre, correo electrónico, teléfono y ciudad.", "Al enviar el formulario de solicitud."],
              ["Quien pide una cotización", "Consumo mensual (kWh), tarifa, operador de red, estrato y tipo de conexión eléctrica.", "Al completar los datos del simulador."],
              ["Quien pide una cotización", "Ubicación de la instalación: coordenadas, municipio y departamento.", "Al marcar o buscar el lugar en el mapa."],
              ["Quien pide una cotización", "El kit elegido, la preferencia de instalador y, si la usas, la simulación de financiación (valores de referencia, no una solicitud de crédito).", "Al configurar el kit."],
              ["Quien pide una cotización", "Constancia de tu autorización (fecha y hora) y una huella de la conexión: un código derivado de tu dirección IP que no permite recuperarla.", "Al enviar la solicitud."],
              ["Quien sube una factura", "La factura se envía a un servicio de lectura con inteligencia artificial para extraer consumo y tarifa. No guardamos el archivo ni extraemos tu nombre, dirección ni número de cuenta.", "Solo si eliges subir la factura."],
              ["Personal de Zeus y cuadrillas", "Nombre, correo, contraseña (guardada cifrada con hash, nunca en claro), rol, y por cada sesión la dirección IP y el navegador.", "Al crearles una cuenta y al iniciar sesión."],
              ["Cualquier visitante", "Sin cuenta ni cookies de seguimiento. Tu navegador envía su dirección IP a los servidores que muestran la página y el mapa (ver sección 6).", "Al navegar."],
            ],
          },
        },
        { note: "No recogemos datos sensibles (salud, origen racial, orientación política o religiosa, datos biométricos, etc.) ni datos de niños, niñas y adolescentes. Este sitio no está dirigido a menores de edad." },
      ],
    },
    {
      id: "finalidades",
      title: "4. Para qué usamos tus datos",
      body: [
        "Usamos tus datos únicamente para estas finalidades:",
        {
          list: [
            "Dimensionar tu sistema solar y calcular el ahorro estimado que ves en el simulador.",
            "Elaborar y enviarte la cotización que solicitaste, y contactarte por teléfono, WhatsApp o correo para confirmarla.",
            "Si apruebas la cotización con instalación: asignar un equipo, agendar la visita técnica y la instalación, y hacer el seguimiento del proyecto (cronograma, materiales, monitoreo y soporte posterior).",
            "Mantener la seguridad del sitio y evitar abusos (por ejemplo, limitar el número de solicitudes desde una misma conexión).",
            "Cumplir obligaciones legales y atender requerimientos de autoridades competentes.",
          ],
        },
        "No vendemos tus datos, no los usamos para publicidad de terceros y no tomamos decisiones automatizadas con efectos jurídicos sobre ti. Si en el futuro quisiéramos usarlos para otra finalidad (por ejemplo, enviarte promociones), te pediremos una autorización aparte.",
      ],
    },
    {
      id: "autorizacion",
      title: "5. Tu autorización",
      body: [
        "Antes de enviar una solicitud de cotización te pedimos marcar una casilla con tu autorización previa, expresa e informada para tratar tus datos de contacto según esta política. Guardamos la fecha y hora de esa autorización como prueba.",
        "Puedes revocar tu autorización o pedir que suprimamos tus datos en cualquier momento escribiendo a {privacyEmail}, salvo que exista un deber legal o contractual de conservarlos. Si revocas, es posible que ya no podamos atender tu cotización o tu proyecto.",
      ],
    },
    {
      id: "terceros",
      title: "6. Con quién compartimos tus datos",
      body: [
        "Para prestar el servicio usamos proveedores que tratan datos por nuestra cuenta (encargados). No les permitimos usarlos para sus propios fines. Estos son los que intervienen hoy:",
        {
          table: {
            head: ["Proveedor", "Para qué", "Qué recibe"],
            rows: [
              ["Vercel", "Alojamiento del sitio, funciones del servidor y puerta de enlace de IA (AI Gateway).", "Todo lo que pasa por el sitio, incluida tu dirección IP."],
              ["Neon (sobre Amazon Web Services, EE. UU.)", "Base de datos donde se guardan las solicitudes y las cuentas del equipo.", "Los datos de las secciones 3 y 4 que guardamos."],
              ["Proveedor del modelo de IA (Anthropic, a través de Vercel AI Gateway)", "Leer la factura que subes y extraer consumo y tarifa.", "La factura completa que subes. No la guardamos; su tratamiento por el proveedor se rige por sus términos."],
              ["OpenStreetMap", "Mapa y búsqueda de lugares.", "Tu navegador pide las teselas del mapa directamente a su servidor (recibe tu IP y la zona que ves). La búsqueda de un lugar la hace nuestro servidor, con el texto buscado."],
              ["NASA POWER", "Horas de sol de tu zona.", "Las coordenadas del lugar de instalación, enviadas desde nuestro servidor."],
              ["datos.gov.co (Gobierno de Colombia)", "Tasas de interés públicas para la simulación de financiación.", "Nada personal."],
              ["Equipo de instalación asignado", "Hacer la visita técnica y la instalación.", "Nombre, teléfono, ciudad, ubicación y el kit de tu proyecto."],
            ],
          },
        },
        "También podemos entregar datos a autoridades cuando la ley lo exija.",
        { note: "Transferencia internacional: Vercel, Neon y el proveedor de IA pueden tratar datos en servidores fuera de Colombia, principalmente en Estados Unidos. Lo hacemos con proveedores que ofrecen garantías contractuales de seguridad y confidencialidad, conforme al artículo 26 de la Ley 1581 de 2012." },
      ],
    },
    {
      id: "derechos",
      title: "7. Tus derechos como titular",
      body: [
        "De acuerdo con el artículo 8 de la Ley 1581 de 2012, tienes derecho a:",
        {
          list: [
            "Conocer, actualizar y rectificar tus datos personales.",
            "Solicitar prueba de la autorización que nos diste.",
            "Ser informado, previa solicitud, del uso que hemos dado a tus datos.",
            "Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley.",
            "Revocar la autorización y/o solicitar la supresión de tus datos cuando no se respeten los principios, derechos y garantías legales.",
            "Acceder de forma gratuita a tus datos personales que hayan sido objeto de tratamiento.",
          ],
        },
      ],
    },
    {
      id: "ejercer",
      title: "8. Cómo ejercer tus derechos (consultas y reclamos)",
      body: [
        "Escríbenos a {privacyEmail}, a la atención de {privacyOwner}. Indica tu nombre, un medio para responderte, el correo o teléfono con el que hiciste la solicitud y qué quieres conocer, corregir o suprimir. Podemos pedirte datos para confirmar que eres el titular.",
        {
          list: [
            "Consultas: las respondemos en máximo 10 días hábiles. Si no es posible, te avisaremos el motivo y la nueva fecha, que no superará 5 días hábiles adicionales.",
            "Reclamos (corrección, actualización o supresión): los atendemos en máximo 15 días hábiles. Si no es posible, te avisaremos el motivo y la nueva fecha, que no superará 8 días hábiles adicionales.",
          ],
        },
        "Si no estás conforme con la respuesta, puedes acudir a la Superintendencia de Industria y Comercio (www.sic.gov.co) una vez agotado este trámite.",
      ],
    },
    {
      id: "conservacion",
      title: "9. Cuánto tiempo conservamos tus datos",
      body: [
        "Las solicitudes y cotizaciones se conservan {retentionQuotes}. Si la cotización se convierte en un proyecto, conservamos lo necesario mientras dure la relación y los plazos legales o de garantía aplicables. Las cuentas del equipo se conservan {retentionAccounts}.",
        "Pasado ese tiempo, suprimimos los datos o los anonimizamos de forma que ya no te identifiquen.",
      ],
    },
    {
      id: "seguridad",
      title: "10. Seguridad",
      body: ["Aplicamos medidas técnicas y organizativas para proteger tus datos contra acceso no autorizado, pérdida o alteración. Las describimos en nuestra [política de seguridad](/security). Ningún sistema es infalible: si ocurre un incidente que afecte tus datos, lo gestionaremos y lo informaremos a la SIC y a los titulares en los casos que la ley exige."],
    },
    {
      id: "cookies",
      title: "11. Cookies y tecnologías similares",
      body: [
        "No usamos cookies de analítica, publicidad ni seguimiento, y el sitio no guarda datos tuyos en tu navegador.",
        "Solo el personal de Zeus recibe, al iniciar sesión, una cookie de sesión necesaria para mantener su acceso; se elimina al cerrar sesión o al caducar. Los visitantes no reciben cookies de la aplicación.",
        "El mapa lo sirve un tercero (OpenStreetMap), que como cualquier servidor web recibe la dirección IP de tu navegador al cargarlo.",
      ],
    },
    {
      id: "cambios",
      title: "12. Cambios en esta política",
      body: ["Si cambiamos cómo tratamos tus datos, actualizaremos esta página con la nueva versión y fecha. Si el cambio es sustancial (por ejemplo, una finalidad nueva), te lo informaremos y, cuando corresponda, te pediremos una nueva autorización."],
    },
  ],
};

const en: LegalDoc = {
  title: "Privacy and personal data processing policy",
  description: "What personal data Zeus collects, what it is used for, who it is shared with and how to exercise your data-protection rights.",
  intro:
    "At Zeus we want you to know, without fine print, which of your data we use when you simulate your savings or request a quote, what for, who we share it with, and how you can access it, correct it or ask us to delete it.",
  updatedLabel: "Last updated",
  versionLabel: "Version",
  tocLabel: "On this page",
  notice: "Courtesy translation. The Spanish version is the authoritative text and prevails in case of any discrepancy.",
  sections: [
    {
      id: "responsable",
      title: "1. Who is responsible",
      body: [
        "The controller of your personal data is:",
        { list: ["Name or company name: {name}", "Tax or ID number: {id}", "Address: {address}, {city}", "Email for queries and complaints: {privacyEmail}", "Phone: {phone}", "Website: {site}"] },
        "This policy applies to the data we collect on this website and on the internal platform used by our team.",
      ],
    },
    {
      id: "marco",
      title: "2. Legal framework",
      body: ["We process your data in accordance with Colombian Law 1581 of 2012 (general personal data protection regime), Decree 1377 of 2013 (compiled in Decree 1074 of 2015) and the guidance of the Superintendence of Industry and Commerce (SIC), Colombia's data protection authority."],
    },
    {
      id: "datos",
      title: "3. What data we collect",
      body: [
        "We only collect what each step needs. Depending on what you do on the site:",
        {
          table: {
            head: ["Who", "What data", "When"],
            rows: [
              ["Whoever requests a quote", "Name, email, phone and city.", "When you submit the request form."],
              ["Whoever requests a quote", "Monthly consumption (kWh), tariff, grid operator, socioeconomic stratum and type of electrical connection.", "When you complete the simulator data."],
              ["Whoever requests a quote", "Installation location: coordinates, municipality and department.", "When you mark or search the place on the map."],
              ["Whoever requests a quote", "The chosen kit, installer preference and, if you use it, the financing simulation (reference values, not a credit application).", "When you configure the kit."],
              ["Whoever requests a quote", "Proof of your authorization (date and time) and a connection fingerprint: a code derived from your IP address that cannot be reversed.", "When you submit the request."],
              ["Whoever uploads a bill", "The bill is sent to an AI reading service to extract consumption and tariff. We do not store the file nor extract your name, address or account number.", "Only if you choose to upload a bill."],
              ["Zeus staff and crews", "Name, email, password (stored as a hash, never in plain text), role, and for each session the IP address and browser.", "When their account is created and when they sign in."],
              ["Any visitor", "No account and no tracking cookies. Your browser sends its IP address to the servers that deliver the page and the map (see section 6).", "When browsing."],
            ],
          },
        },
        { note: "We do not collect sensitive data (health, racial origin, political or religious views, biometrics, etc.) nor data of children and adolescents. This site is not aimed at minors." },
      ],
    },
    {
      id: "finalidades",
      title: "4. What we use your data for",
      body: [
        "We use your data only for these purposes:",
        {
          list: [
            "Sizing your solar system and calculating the estimated savings shown in the simulator.",
            "Preparing and sending the quote you requested, and contacting you by phone, WhatsApp or email to confirm it.",
            "If you approve a quote with installation: assigning a crew, scheduling the technical visit and the installation, and tracking the project (schedule, materials, monitoring and after-sales support).",
            "Keeping the site secure and preventing abuse (for example, limiting requests from a single connection).",
            "Complying with legal obligations and answering requests from competent authorities.",
          ],
        },
        "We do not sell your data, we do not use it for third-party advertising, and we do not make automated decisions with legal effects about you. If we ever want to use it for another purpose (for example, sending promotions), we will ask for a separate authorization.",
      ],
    },
    {
      id: "autorizacion",
      title: "5. Your authorization",
      body: [
        "Before sending a quote request we ask you to tick a box giving your prior, express and informed authorization to process your contact data under this policy. We keep the date and time of that authorization as proof.",
        "You may revoke your authorization or ask us to delete your data at any time by writing to {privacyEmail}, unless there is a legal or contractual duty to keep it. If you revoke, we may no longer be able to handle your quote or project.",
      ],
    },
    {
      id: "terceros",
      title: "6. Who we share your data with",
      body: [
        "To provide the service we use providers that process data on our behalf (processors). We do not allow them to use it for their own purposes. These are the ones involved today:",
        {
          table: {
            head: ["Provider", "What for", "What it receives"],
            rows: [
              ["Vercel", "Site hosting, server functions and AI gateway (AI Gateway).", "Everything that goes through the site, including your IP address."],
              ["Neon (on Amazon Web Services, USA)", "Database where requests and staff accounts are stored.", "The data in sections 3 and 4 that we store."],
              ["AI model provider (Anthropic, through Vercel AI Gateway)", "Reading the bill you upload and extracting consumption and tariff.", "The full bill you upload. We do not store it; the provider's handling of it is governed by its terms."],
              ["OpenStreetMap", "Map and place search.", "Your browser requests map tiles directly from its server (it receives your IP and the area you view). Place searches are made by our server, with the search text."],
              ["NASA POWER", "Sun hours for your area.", "The installation coordinates, sent from our server."],
              ["datos.gov.co (Government of Colombia)", "Public interest rates for the financing simulation.", "Nothing personal."],
              ["Assigned installation crew", "Carrying out the technical visit and the installation.", "Name, phone, city, location and your project's kit."],
            ],
          },
        },
        "We may also hand data to authorities when the law requires it.",
        { note: "International transfer: Vercel, Neon and the AI provider may process data on servers outside Colombia, mainly in the United States. We do so with providers that offer contractual security and confidentiality guarantees, under article 26 of Law 1581 of 2012." },
      ],
    },
    {
      id: "derechos",
      title: "7. Your rights as a data subject",
      body: [
        "Under article 8 of Law 1581 of 2012 you have the right to:",
        {
          list: [
            "Know, update and correct your personal data.",
            "Request proof of the authorization you gave us.",
            "Be informed, on request, of how we have used your data.",
            "File complaints with the Superintendence of Industry and Commerce for breaches of the law.",
            "Revoke the authorization and/or request deletion of your data when legal principles, rights and guarantees are not respected.",
            "Access free of charge your personal data that has been processed.",
          ],
        },
      ],
    },
    {
      id: "ejercer",
      title: "8. How to exercise your rights (queries and complaints)",
      body: [
        "Write to {privacyEmail}, attention {privacyOwner}. Include your name, a way to reply, the email or phone you used for the request, and what you want to know, correct or delete. We may ask for details to confirm you are the data subject.",
        {
          list: [
            "Queries: answered within 10 business days at most. If that is not possible, we will tell you why and the new date, which will not exceed 5 additional business days.",
            "Complaints (correction, update or deletion): handled within 15 business days at most. If that is not possible, we will tell you why and the new date, which will not exceed 8 additional business days.",
          ],
        },
        "If you are not satisfied with the answer, you may go to the Superintendence of Industry and Commerce (www.sic.gov.co) once this process has been exhausted.",
      ],
    },
    {
      id: "conservacion",
      title: "9. How long we keep your data",
      body: [
        "Requests and quotes are kept {retentionQuotes}. If a quote becomes a project, we keep what is needed for the duration of the relationship and the applicable legal or warranty periods. Staff accounts are kept {retentionAccounts}.",
        "After that, we delete the data or anonymize it so that it no longer identifies you.",
      ],
    },
    {
      id: "seguridad",
      title: "10. Security",
      body: ["We apply technical and organizational measures to protect your data against unauthorized access, loss or alteration. They are described in our [security policy](/security). No system is infallible: if an incident affecting your data occurs, we will handle it and report it to the SIC and to data subjects where the law requires."],
    },
    {
      id: "cookies",
      title: "11. Cookies and similar technologies",
      body: [
        "We do not use analytics, advertising or tracking cookies, and the site does not store your data in your browser.",
        "Only Zeus staff receive, when signing in, a session cookie needed to keep their access; it is removed on sign-out or when it expires. Visitors do not receive application cookies.",
        "The map is served by a third party (OpenStreetMap), which, like any web server, receives your browser's IP address when loading it.",
      ],
    },
    {
      id: "cambios",
      title: "12. Changes to this policy",
      body: ["If we change how we process your data, we will update this page with the new version and date. If the change is substantial (for example, a new purpose), we will let you know and, where applicable, ask for a new authorization."],
    },
  ],
};

export const privacy = { es, en } as const;

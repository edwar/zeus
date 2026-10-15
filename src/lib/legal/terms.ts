import type { LegalDoc } from "./types";

/**
 * Términos y condiciones de la cotización y la venta. Describe cómo funciona hoy el flujo de la plataforma (cotización con
 * enlace que vence, aceptar no es aprobar, aprobación del asesor, visita técnica, acta de entrega) y se apoya en la Ley 1480
 * de 2011 (Estatuto del Consumidor). No inventa precios, plazos ni garantías comerciales: remite a lo que diga cada cotización,
 * contrato o acta. Si cambia el flujo, hay que actualizar este texto y subir `LEGAL.version`.
 * Es un borrador de buena fe, NO una opinión legal: debe revisarlo un abogado antes de darlo por definitivo.
 */
const es: LegalDoc = {
  title: "Términos y condiciones de la cotización y la venta",
  description: "Cómo funcionan el simulador, la cotización, su aceptación y aprobación, la instalación, las garantías y el derecho de retracto en Zeus.",
  intro:
    "Estos términos explican, en lenguaje sencillo, qué pasa desde que simulas tu ahorro hasta que tu sistema solar queda instalado, y qué derechos y obligaciones tienen las dos partes. Al pedir una cotización o aceptarla desde su enlace, declaras que los leíste.",
  updatedLabel: "Última actualización",
  versionLabel: "Versión",
  tocLabel: "En esta página",
  sections: [
    {
      id: "quienes",
      title: "1. Quiénes somos y a qué se aplican",
      body: [
        "El oferente es {name}, identificado con {id}, con domicilio en {address}, {city}. Puedes escribirnos a {privacyEmail} o llamarnos al {phone}.",
        "Estos términos aplican al sitio {site}, al simulador, a las cotizaciones, a la venta de kits solares y de otros productos del catálogo, y al servicio de instalación cuando se contrata. Para el tratamiento de tus datos personales aplica la [política de privacidad](/privacy).",
      ],
    },
    {
      id: "simulador",
      title: "2. El simulador es una estimación",
      body: [
        "El simulador calcula el tamaño del sistema, el ahorro, la generación y la financiación a partir de los datos que tú confirmas (consumo, tarifa, ubicación) y de supuestos públicos (por ejemplo, la radiación solar de tu zona). Son estimaciones orientativas: no garantizan un ahorro, una producción ni una fecha de recuperación de la inversión, que dependen del clima, del uso real, de las tarifas y de la instalación.",
        "La financiación que ves es una simulación con tasas públicas de referencia. No es un crédito aprobado: lo otorga y decide la entidad financiera, con sus propias condiciones.",
      ],
    },
    {
      id: "cotizacion",
      title: "3. La cotización",
      body: [
        "La cotización es una propuesta referencial. Los precios salen del catálogo vigente el día en que se calcula y se confirman al aprobarla; pueden cambiar si el proveedor cambia su precio o si se agota un producto.",
        "Si tu asesor te comparte un enlace, la cotización de ese enlace tiene una vigencia: verás la fecha en «Válida hasta» (hoy 15 días desde que se genera). Pasada esa fecha, o si el asesor ajusta el kit y genera un enlace nuevo, el enlace anterior deja de servir y la oferta se actualiza.",
        "Los valores están en pesos colombianos (COP), salvo que se indique otra cosa. Los impuestos aplicables y lo que incluye el precio (producto, instalación, transporte) se detallan en la cotización o en el contrato; si algo no está incluido, se dice expresamente.",
      ],
    },
    {
      id: "aceptar",
      title: "4. Aceptar no es lo mismo que aprobar",
      body: [
        "Cuando pulsas «Aceptar cotización» registras que quieres avanzar y avisamos a tu asesor. Eso todavía no es un contrato de venta.",
        "El contrato se forma cuando Zeus aprueba tu solicitud y te lo confirma, después de validar la disponibilidad de los productos y, si hay instalación, la cobertura de un equipo en tu zona y los datos técnicos. Hasta ese momento ninguna de las dos partes está obligada, y puedes cambiar de opinión sin costo («No por ahora»).",
        "Si entre tu respuesta y la aprobación el valor de la cotización cambió, no se acepta la cifra anterior: se te muestra la actualizada.",
      ],
    },
    {
      id: "visita",
      title: "5. Visita técnica y cambios al diseño",
      body: [
        "Con instalación, el diseño definitivo se confirma en una visita técnica a tu predio. Tras la visita puede cambiar el alcance o el precio (por ejemplo, por el estado de la cubierta, del tablero eléctrico o de la acometida).",
        "Cualquier cambio se te informa por escrito y no se ejecuta sin tu aceptación. Si no estás de acuerdo con el cambio, puedes no continuar; lo que ya se haya prestado o comprado a tu pedido se trata según lo acordado por escrito y lo que diga la ley.",
      ],
    },
    {
      id: "modalidades",
      title: "6. Con instalación o solo el kit",
      body: [
        {
          list: [
            "Con instalación: si tu predio está dentro de la zona donde tenemos equipos, Zeus asigna o coordina el equipo instalador. Al terminar se firma un acta de entrega, que queda disponible en tu página privada.",
            "Solo el kit: si estás fuera de la zona de instalación (o prefieres tu propio instalador), vendemos el kit y la instalación la hace el profesional que tú elijas. Zeus no responde por la instalación hecha por terceros, pero sí por los productos que vende, en los términos de la sección 9.",
          ],
        },
      ],
    },
    {
      id: "pagos",
      title: "7. Pagos",
      body: [
        "Este sitio no recibe pagos. La forma, los plazos y las cuentas de pago se acuerdan por escrito al aprobar la solicitud o en el contrato. Desconfía de cualquier cobro que no esté respaldado por ese documento y verifica con nosotros por los canales de la sección 1 antes de pagar.",
      ],
    },
    {
      id: "entrega",
      title: "8. Entrega, instalación y plazos",
      body: [
        "Los plazos que te damos son estimados. Dependen de la disponibilidad del proveedor, de los permisos y trámites del operador de red, del acceso al predio y del clima. Si prevemos un retraso importante te avisaremos.",
        "Al terminar la instalación se hace la entrega y se firma el acta. Revísala antes de firmar: deja constancia de lo instalado y del estado en que se entrega.",
        "Tu parte: dar acceso seguro al predio, garantizar que tienes derecho a instalar en él (propietario, o autorización del propietario o de la copropiedad), dar información veraz y no manipular los equipos instalados sin autorización.",
      ],
    },
    {
      id: "garantias",
      title: "9. Garantías",
      body: [
        "Tienes la garantía legal que reconoce el Estatuto del Consumidor (Ley 1480 de 2011) sobre los productos y sobre el servicio de instalación. Los productos (paneles, inversores, baterías, estructuras, cableado) tienen además la garantía del fabricante o proveedor, que atendemos como vendedor.",
        "El término de cada garantía es el que conste en tu cotización, contrato, ficha del producto o acta de entrega; si no se indicó uno, el que fije la ley. Para reclamar, escríbenos con tu número de referencia, qué falla y, si puedes, fotos.",
        "La garantía no cubre daños por mal uso, por manipulación o reparación hechas por personas no autorizadas por nosotros, por falta del mantenimiento indicado, ni por hechos de fuerza mayor o caso fortuito (descargas atmosféricas, inundaciones, incendios, vandalismo) salvo lo que la ley o el fabricante establezcan. Las estimaciones de generación no son una garantía de producción.",
      ],
    },
    {
      id: "retracto",
      title: "10. Derecho de retracto y cancelación",
      body: [
        "Antes de la aprobación puedes desistir sin costo (sección 4).",
        "Cuando la venta se hace a distancia (por este sitio, por teléfono o por medios electrónicos), la ley te da derecho de retracto: puedes devolver el producto o terminar el contrato dentro de los 5 días hábiles siguientes a la entrega del bien o a la celebración del contrato de servicio, escribiéndonos a {privacyEmail} y devolviendo el producto en las mismas condiciones en que lo recibiste. Si te corresponde, te devolvemos el dinero dentro de los 30 días calendario siguientes a tu aviso.",
        "La ley establece excepciones a este derecho, por ejemplo cuando el servicio ya empezó a prestarse con tu acuerdo, o cuando el producto se hizo o se configuró según tus especificaciones. Si una de ellas aplica a tu caso, te lo explicaremos por escrito.",
      ],
    },
    {
      id: "responsabilidad",
      title: "11. Responsabilidad",
      body: [
        "Respondemos por lo que la ley nos obliga y por lo que prometimos por escrito. En la medida en que la ley lo permite, no respondemos por daños indirectos, como la pérdida de ganancias o de ahorros esperados. Nada de lo anterior limita los derechos irrenunciables que tienes como consumidor.",
      ],
    },
    {
      id: "contenido",
      title: "12. Contenido del sitio",
      body: [
        "El diseño, los textos, las marcas y los cálculos del sitio son de {name} o de sus licenciantes. Puedes usarlos para evaluar tu proyecto, pero no copiarlos ni revenderlos. La información de productos de terceros (marcas, fichas, imágenes) pertenece a sus titulares.",
      ],
    },
    {
      id: "cambios",
      title: "13. Cambios a estos términos",
      body: [
        "Podemos actualizar estos términos. Siempre verás arriba la versión y la fecha. Una cotización que aceptaste se rige por la versión vigente el día en que la aceptaste.",
      ],
    },
    {
      id: "ley",
      title: "14. Ley aplicable y reclamos",
      body: [
        "Estos términos se rigen por las leyes de Colombia. Si tienes una queja, escríbenos primero a {privacyEmail}: queremos resolverla. Si no quedas conforme, puedes acudir a la Superintendencia de Industria y Comercio (www.sic.gov.co), autoridad de protección al consumidor, o a la justicia ordinaria.",
      ],
    },
  ],
};

const en: LegalDoc = {
  title: "Terms and conditions for quotes and sales",
  description: "How the simulator, the quote, its acceptance and approval, installation, warranties and the right of withdrawal work at Zeus.",
  intro:
    "These terms explain in plain language what happens from the moment you simulate your savings until your solar system is installed, and what rights and obligations each party has. By requesting a quote or accepting it from its link, you declare that you have read them.",
  updatedLabel: "Last updated",
  versionLabel: "Version",
  tocLabel: "On this page",
  notice: "Courtesy translation. The Spanish version is the binding one.",
  sections: [
    {
      id: "quienes",
      title: "1. Who we are and what these terms cover",
      body: [
        "The seller is {name}, identified with {id}, domiciled at {address}, {city}. You can write to {privacyEmail} or call {phone}.",
        "These terms apply to {site}, the simulator, quotes, the sale of solar kits and other catalog products, and the installation service when it is hired. Your personal data is handled under the [privacy policy](/privacy).",
      ],
    },
    {
      id: "simulador",
      title: "2. The simulator is an estimate",
      body: [
        "The simulator calculates system size, savings, generation and financing from the data you confirm (consumption, tariff, location) and from public assumptions (for example, the solar radiation in your area). These are indicative estimates: they do not guarantee savings, production or a payback date, which depend on weather, actual use, tariffs and the installation.",
        "The financing you see is a simulation with public reference rates. It is not an approved loan: the financial institution grants and decides it under its own conditions.",
      ],
    },
    {
      id: "cotizacion",
      title: "3. The quote",
      body: [
        "The quote is a reference proposal. Prices come from the catalog in force on the day it is calculated and are confirmed when it is approved; they may change if the supplier changes its price or a product runs out.",
        "If your advisor shares a link, the quote on that link has a validity period: you will see the date under “Valid until” (currently 15 days from when it is generated). After that date, or if the advisor adjusts the kit and generates a new link, the previous link stops working and the offer is updated.",
        "Amounts are in Colombian pesos (COP) unless stated otherwise. Applicable taxes and what the price includes (product, installation, transport) are detailed in the quote or the contract; anything not included is stated expressly.",
      ],
    },
    {
      id: "aceptar",
      title: "4. Accepting is not the same as approving",
      body: [
        "When you press “Accept quote” you record that you want to move forward and we notify your advisor. That is not yet a sales contract.",
        "The contract is formed when Zeus approves your request and confirms it to you, after checking product availability and, if installation is included, that a team covers your area and the technical data. Until then neither party is bound, and you can change your mind at no cost (“Not for now”).",
        "If the value of the quote changed between your answer and the approval, the earlier figure is not accepted: you are shown the updated one.",
      ],
    },
    {
      id: "visita",
      title: "5. Technical visit and design changes",
      body: [
        "With installation, the final design is confirmed in a technical visit to your property. After the visit the scope or price may change (for example, because of the condition of the roof, the electrical panel or the service entrance).",
        "Any change is communicated to you in writing and is not carried out without your acceptance. If you disagree with the change you may choose not to continue; what has already been provided or bought at your request is handled as agreed in writing and as the law provides.",
      ],
    },
    {
      id: "modalidades",
      title: "6. With installation or kit only",
      body: [
        {
          list: [
            "With installation: if your property is within the area where we have teams, Zeus assigns or coordinates the installation team. When finished, a delivery certificate is signed and made available on your private page.",
            "Kit only: if you are outside the installation area (or prefer your own installer), we sell the kit and the installation is done by the professional you choose. Zeus is not responsible for installation done by third parties, but it is for the products it sells, under section 9.",
          ],
        },
      ],
    },
    {
      id: "pagos",
      title: "7. Payments",
      body: [
        "This site does not receive payments. The method, schedule and payment accounts are agreed in writing when the request is approved or in the contract. Be wary of any charge not backed by that document and check with us through the channels in section 1 before paying.",
      ],
    },
    {
      id: "entrega",
      title: "8. Delivery, installation and deadlines",
      body: [
        "The deadlines we give you are estimates. They depend on supplier availability, grid operator permits and procedures, access to the property and the weather. If we foresee a significant delay we will tell you.",
        "When the installation is finished, delivery takes place and the certificate is signed. Read it before signing: it records what was installed and the condition in which it is handed over.",
        "Your part: give safe access to the property, make sure you have the right to install on it (owner, or authorization from the owner or the co-ownership), provide truthful information and not tamper with the installed equipment without authorization.",
      ],
    },
    {
      id: "garantias",
      title: "9. Warranties",
      body: [
        "You have the legal warranty recognized by the Consumer Statute (Law 1480 of 2011) on the products and on the installation service. The products (panels, inverters, batteries, structures, wiring) also carry the manufacturer's or supplier's warranty, which we handle as the seller.",
        "The term of each warranty is the one stated in your quote, contract, product sheet or delivery certificate; if none was stated, the one set by law. To claim, write to us with your reference number, what failed and, if you can, photos.",
        "The warranty does not cover damage caused by misuse, by handling or repairs made by people we have not authorized, by lack of the indicated maintenance, or by force majeure or fortuitous events (lightning, floods, fire, vandalism), except as the law or the manufacturer provide. Generation estimates are not a production guarantee.",
      ],
    },
    {
      id: "retracto",
      title: "10. Right of withdrawal and cancellation",
      body: [
        "Before approval you can withdraw at no cost (section 4).",
        "When the sale is made at a distance (through this site, by phone or by electronic means), the law gives you a right of withdrawal: you can return the product or end the contract within 5 business days after the goods are delivered or the service contract is concluded, by writing to {privacyEmail} and returning the product in the same condition you received it. If it applies to you, we refund the money within 30 calendar days of your notice.",
        "The law sets exceptions to this right, for example when the service has already started with your agreement, or when the product was made or configured to your specifications. If one of them applies to your case, we will explain it to you in writing.",
      ],
    },
    {
      id: "responsabilidad",
      title: "11. Liability",
      body: [
        "We answer for what the law requires and for what we promised in writing. To the extent the law allows, we are not liable for indirect damages, such as loss of profits or of expected savings. Nothing above limits the rights you cannot waive as a consumer.",
      ],
    },
    {
      id: "contenido",
      title: "12. Site content",
      body: [
        "The design, texts, trademarks and calculations on the site belong to {name} or its licensors. You may use them to evaluate your project, but not copy or resell them. Third-party product information (brands, data sheets, images) belongs to its owners.",
      ],
    },
    {
      id: "cambios",
      title: "13. Changes to these terms",
      body: [
        "We may update these terms. You will always see the version and date at the top. A quote you accepted is governed by the version in force on the day you accepted it.",
      ],
    },
    {
      id: "ley",
      title: "14. Governing law and complaints",
      body: [
        "These terms are governed by the laws of Colombia. If you have a complaint, write to {privacyEmail} first: we want to solve it. If you are not satisfied, you can go to the Superintendence of Industry and Commerce (www.sic.gov.co), the consumer protection authority, or to the ordinary courts.",
      ],
    },
  ],
};

export const terms = { es, en } as const;

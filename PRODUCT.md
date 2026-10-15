# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Clientes finales y comunidades** en regiones cálidas o rurales con tarifas eléctricas muy altas, con tarifas altas, consumos fuertes (aire acondicionado, bombeo, refrigeración) y redes poco estables. Buscan bajar la factura, gastar menos energía y depender menos de la red ante apagones o racionamientos por sequía. Hogares y negocios.
- **Profesionales, ingenieros e instaladores** (personal interno) que gestionan el ciclo de vida de cada proyecto: planificación, cotización, diseño técnico, logística de instalación y seguimiento post-venta. Técnicos en campo (móvil) y gerencia/ingeniería (escritorio).

## Product Purpose
Zeus comercializa e implementa soluciones fotovoltaicas y de domótica eco-amigable. La plataforma tiene dos caras: un portal comercial/educativo que convierte (landing, simulador de ahorro, catálogo de kits y domótica) y un sistema de gestión operativo para el equipo (proyectos en Kanban/lista, cronogramas, asignación de recursos, checklist de materiales, hitos, panel técnico con métricas y alertas). Éxito: el cliente entiende su ahorro y solicita cotización; el equipo lleva cada proyecto con menos fricción.

## Positioning
Zeus enfrenta el ahorro solar contra el costo real de la factura de luz (el aire acondicionado es el gancho, no el único consumo) y ofrece independencia de la red, y cubre el ciclo completo (venta, ingeniería, instalación, monitoreo) en una sola plataforma.

## Operating Context
- Portal cliente: visitantes que comparan factura eléctrica vs. inversión solar; decisión de compra considerada.
- Gestión: etapas de proyecto Prospecto → Visita técnica → Diseño de ingeniería → Instalación → Monitoreo. Uso en campo (móvil, sol directo, conectividad variable) y en oficina (escritorio).

## Capabilities and Constraints
- Multi-idioma desde el inicio (español + inglés como mínimo); mercado/país, moneda y tarifas eléctricas **sin definir**: deben ser parametrizables.
- Stack elegido: proyecto Next.js/React con componentes reutilizables y tokens.
- Mobile-first; vistas de escritorio robustas para gerencia e ingeniería.
- Componentes clave: tarjetas de proyecto, gráficos de consumo/ahorro, acciones rápidas, formularios de cotización.
- Backend propio: Next.js (App Router) con Prisma sobre Postgres, autenticación con Better Auth, correo transaccional con Resend y almacenamiento de imágenes en S3. El contenido comercial sigue siendo demo hasta que haya datos reales (ver Evidence on Hand).

## Brand Commitments
- Nombre: Zeus.
- Dirección declarada por el usuario (rediseño de oct. 2026): moderna, fresca y llamativa, sin perder legibilidad ni profesionalismo; campos de color jugosos (amarillo maracuyá, lima, azul cielo) con verde selva como ancla, formas redondeadas, fondos blancos y claros; tipografía Gabarito (titulares) y Figtree (interfaz). Mantiene el espíritu eco-amigable. Ver DESIGN.md.

## Evidence on Hand
Ninguna por ahora. Los casos reales se cargan desde el menú «Casos» solo cuando un cliente los autoriza y el ahorro está verificado. No hay logo, catálogo, precios, fotos de proyectos ni testimonios. Todo contenido será demo, marcado como sintético, con lista de reemplazo. No inventar precios reales, clientes, benchmarks ni garantías.

## Product Principles
1. El ahorro se demuestra con el cálculo del propio visitante, no se afirma.
2. El técnico en campo manda en el diseño operativo: una mano, sol directo, conexión pobre.
3. Un solo sistema de datos de proyecto alimenta la cotización, la ingeniería y el seguimiento.
4. Ningún dato comercial se inventa; lo sintético se etiqueta.

## Roadmap de funcionalidades
Se desarrollan poco a poco, en este orden de prioridad. Cada una debe respetar los Product Principles y la «Definición de terminado» (incluye las dos guías: la del equipo y la del comprador).

### Prioridad alta (cierran el ciclo de venta)
1. ✅ **Cotización en PDF con enlace público.** El asesor genera un enlace (vence a los 15 días) desde la solicitud con el cálculo confirmado; el cliente ve la cotización sin iniciar sesión, descarga el PDF y la acepta o la rechaza. **Aceptar no aprueba:** queda registrado, se avisa por correo al equipo y el asesor aprueba después de validar la disponibilidad del equipo. El enlace se puede enviar a mano por WhatsApp (`wa.me`).
2. ✅ **Notificaciones al cliente por correo (Resend).** Salen en el idioma en que el cliente pidió la cotización: el enlace de la cotización (a demanda, botón «Enviar por correo»), la aprobación y cada avance de etapa del proyecto (automáticos, solo al avanzar, una vez por etapa y con interruptor por proyecto). Cada intento queda en el historial de la solicitud. Solo los dispara el equipo autenticado, nunca el formulario público. **WhatsApp queda fuera como canal automático** porque los mensajes enviados por API tienen costo; solo se admite el envío manual (botón que abre `wa.me` con el mensaje prellenado, sin costo ni integración con la API). Los hitos del cronograma son tareas internas de las cuadrillas: se mostrarán al cliente en el portal (punto 3), no por correo.
3. ✅ **Portal del cliente.** Página privada y de solo lectura (`/{idioma}/p/…`) con etapa, avance, hitos con fechas, materiales, estimado de generación (rotulado como estimado de diseño: aún no hay datos reales del inversor), enlace a la app de monitoreo y su cotización en PDF. Se entra con un enlace firmado, sin cuenta; llega en los correos de aprobación y de cambio de etapa y se puede reenviar o renovar desde el proyecto. Solo muestra una lista fija de datos: nada de cuadrillas, alertas, equipo ni contacto. *Pendiente para una segunda versión:* producción real vía inversores (ver «Más adelante») y documentos propios del proyecto (punto 9).
4. ✅ **CRM ligero de leads (menú «Seguimiento»).** Una solicitud del simulador ya es un lead: se le agregan **origen** (simulador, catálogo, referido, redes, evento, llamada directa), **notas** y **recordatorios** con responsable. Los contactos que aún no piden cotización (referidos, llamadas, ferias) se registran a mano **con la autorización de la persona** y se enlazan solos con su solicitud si luego la piden (mismo teléfono o correo), conservando su origen. La pestaña «Orígenes» muestra el embudo por canal (solicitudes → atendidas → confirmadas → aprobadas) y la conversión. *Pendiente para una segunda versión:* resumen diario de recordatorios por correo, asignación automática y etiquetas.

### Prioridad media (conversión del simulador)
5. ✅ **Guardar y compartir el resultado del simulador.** En el paso del kit, «Guarda tu cálculo»: un enlace (`/simulator?s=…`, vale 60 días, sin identidad) que devuelve al visitante al mismo kit y la misma financiación con los precios del día, o el envío por correo. Quien deja su correo, con autorización explícita, queda como contacto en el seguimiento (con nota del cálculo y un recordatorio sin responsable para escribirle) y se enlaza solo si luego pide su cotización. Topes por conexión y por correo para que no sirva para escribirle a terceros. *Pendiente:* mostrar el cálculo guardado al equipo dentro de la ficha del contacto.
6. ✅ **Comparador de escenarios.** En el paso del kit, «Compara escenarios» (se abre a pedido): el mismo recibo con 50 %, 75 % y 100 % del consumo (más el elegido) y, en cada tamaño, al contado y financiado: precio, ahorro, recuperación, ganancia neta y retorno a 15 años, cuota inicial y mensual, flujo mensual (ahorro − cuota) y total pagado con intereses. Con insignias de cuál se recupera antes y cuál gana más, «Usar este tamaño» para cambiar el cálculo y los supuestos a la vista. Si dos tamaños terminan en el mismo kit del catálogo (paquetes de paneles) se muestra uno solo. *Pendiente:* comparar niveles de kit (económico/equilibrado/premium) en la misma vista y proyectar alzas de tarifa.
7. ✅ **Casos reales y testimonios.** Menú «Casos»: el equipo carga cada caso (historia, testimonio, proyecto, factura antes/después con cómo y cuándo se verificó, fotos) como borrador. **No se publica sin la autorización del cliente (con su constancia) ni sin el ahorro verificado y cifras coherentes**; la plataforma lo exige en el servidor y le dice al equipo qué falta. Publicado, aparece en la landing y en su ficha con «Resultado verificado»; retirar la autorización lo despublica al instante. Sin casos publicados, el sitio no muestra la sección: nunca contenido inventado. *Pendiente:* cargar los primeros casos reales (requiere clientes que autoricen) y videos.

### Prioridad media (operación y campo)
8. ✅ **PWA de campo con modo offline.** Pantalla «Campo» (instalable en el teléfono, con su propio manifiesto) para el equipo de instalación: checklist de instalación por tipo de sistema (con nota y fotos por paso), materiales, avance del cronograma, fotos de obra y **firma de conformidad del cliente** que genera el **acta de entrega en PDF** (también en el portal del cliente). Funciona **sin señal de verdad**: un service worker abre la app desconectada, todo se guarda en el teléfono (IndexedDB) y se envía solo al volver la conexión, con «gana la última escritura» y envíos que no duplican. Las fotos son privadas (sin URL pública) y todo lo guardado en el teléfono se borra al cerrar sesión. La oficina lo ve en la pestaña «Instalación» del proyecto. *Pendiente:* firmar sin checklist completo con justificación, avisos push y fotos antes/después comparadas.
9. ✅ **Documentos por proyecto** (pestaña *Documentos*: planos, permisos, certificados y contratos en PDF o imagen de hasta 4 MB; privados por defecto, con permiso por proyecto —el equipo de instalación los ve pero no los cambia—, tipo comprobado por los bytes y descarga solo desde el servidor). Gestión decide cuáles ve el cliente en su portal; dejar de compartir es inmediato. Las fotos de obra ya salían del modo campo (punto 8). *Pendiente:* comparar fotos de «antes y después» lado a lado.
10. ✅ **Inventario propio y margen** (menú «Inventario», solo gestión y administración). Convive con los productos del proveedor (Autosolar): lo que se pide al proveedor al aprobar no se cuenta; solo se lleva inventario de lo que se compra para bodega, con **existencias, mínimo y alerta de stock bajo**, **entradas con costo** (costo promedio ponderado), **conteo físico con motivo obligatorio** e **historial de movimientos que no se edita ni se borra**. Cada material de un proyecto sale «del inventario propio» o «del proveedor»; solo se descuenta al marcarlo listo (desde la oficina o el modo campo), una vez, y se devuelve si se desmarca. El simulador y el catálogo ofrecen un producto del proveedor agotado si hay unidades propias. **Margen del kit** por proyecto (venta − costo del proveedor al aprobar o costo promedio del inventario), nunca visible para el equipo de instalación. Las existencias viven aparte del producto: la sincronización con Autosolar no las toca. *Pendiente:* órdenes de compra al proveedor, varias bodegas, costos de instalación y de envío dentro del margen.

### Cumplimiento y exposición legal (revisión de un video sobre apps «vibe coding»; sin desarrollar)
Los montos y leyes del video (COPPA, fallo de Múnich, CIPA de California, CAN-SPAM, renovación automática, DMCA) son de EE. UU. y la UE, vienen de una transcripción hecha con IA y **no están verificados**. Zeus opera en Colombia (Ley 1581 de 2012, SIC), así que antes de invertir hay que confirmar con un abogado qué aplica. Lo que sí se revisó en el código:
- ✅ **Fuentes de Google:** `next/font/google` las descarga al compilar y las sirve desde el propio dominio (CSP `font-src 'self'`): el visitante no le manda su IP a Google. El mapa sí carga teselas de OpenStreetMap y ya está declarado en la política de privacidad.
- ✅ **Analítica y grabación de sesiones:** no hay ninguna instalada (sin cookies de seguimiento; la CSP bloquea scripts de terceros). Si algún día se agrega, debe ir sin grabación de sesiones y con consentimiento.
- ✅ **Registro y edad:** no hay registro público (solo el administrador crea cuentas) y la política dice que el sitio no está dirigido a menores.
- ✅ **Suscripciones / pagos:** no hay Stripe ni cobros recurrentes.
- ✅ **Fotos de usuarios:** nadie sube contenido público; las fotos de obra y documentos son privados y solo del equipo. Los casos publicados llevan autorización del cliente.
- ✅ **Correos al cliente (Resend):** todo correo al cliente sale por un solo camino que agrega el pie con el responsable de los datos (nombre, documento, domicilio, correo de privacidad) y un **enlace de baja firmado** (una página con botón de confirmación; abrirla no da de baja a nadie) más los encabezados `List-Unsubscribe` de un clic. Quien se da de baja queda registrado solo como huella cifrada de su correo; los avisos, el enlace de la cotización y el correo del simulador respetan la baja y el equipo ve «la persona pidió no recibir correos». También se puede registrar a pedido (botón «No enviar más correos»).
- ✅ **Baja y supresión de contactos:** panel «Privacidad de esta persona» en cada solicitud y contacto: «Eliminar datos de esta persona» borra contactos, notas, recordatorios y cálculos, anonimiza solicitudes, anula el enlace de la cotización y bloquea sus correos; el proyecto, las fotos, los documentos y el acta se conservan por la garantía con el nombre anonimizado y el portal desactivado. Deja una constancia sin datos personales. *Pendiente:* los casos publicados se retiran a mano desde «Casos»; el nombre dentro de notas de proyecto o de alertas no se revisa solo.
- ✅ **Retención automática:** cron diario `/api/cron/retention` (06:00 UTC, después de la sincronización) que aplica los plazos de la política (`LEGAL.retentionPolicy`, probados contra el texto): anonimiza solicitudes sin proyecto, sin venta aprobada y sin actividad en 24 meses; borra contactos inactivos, cálculos vencidos, cuentas desactivadas hace más de 12 meses, sesiones vencidas hace 30 días y registros técnicos de 30 días. No toca proyectos, ventas aprobadas ni casos publicados. Cada corrida con cambios deja una constancia sin datos personales. *Pendiente (decisión de negocio/abogado):* cuánto conservar las ventas aprobadas sin proyecto (hoy, sin límite).
- ✅ **Datos del responsable:** `src/lib/legal/config.ts` ya trae los datos reales (sin marcadores pendientes) y cada correo al cliente los muestra. *Pendiente (trámite del negocio, no de código):* confirmar el registro de bases de datos ante la SIC.
- ⚠️ **Términos y condiciones de la cotización y la venta:** publicados en `/{idioma}/terms` (14 secciones, es/en, enlazados desde el pie y desde la pantalla donde el cliente acepta). Es un **borrador de buena fe, no revisado por un abogado**: describe el flujo real (aceptar no es aprobar, visita técnica, acta), cita el Estatuto del Consumidor (retracto de 5 días hábiles y reembolso en 30 días calendario) y remite a la cotización, el contrato o el acta para precios, plazos y términos de garantía, sin inventar cifras. *Por hacer:* revisión de un abogado y, si el negocio lo decide, una casilla de aceptación obligatoria antes de «Aceptar cotización».

### Más adelante
- Auditoría de cambios y roles más finos.
- Reportes para gerencia (embudo, margen por proyecto, tiempo por etapa).
- Integración real con inversores para el monitoreo.
- Garantías y mantenimiento posventa con recordatorios periódicos.

## Definición de terminado
Una función del roadmap no está terminada hasta que, en el mismo cambio:
1. Funciona en español e inglés y tiene pruebas (unitarias y, si es un flujo, E2E).
2. La **guía del equipo** (`docs/guia-equipo/`, que la plataforma muestra en el menú → icono del libro; las secciones nuevas parten de `PLANTILLA.md`) tiene su sección nueva o actualizada: quién puede hacerlo, paso a paso con los nombres exactos de los botones, qué pasa después y qué ve el cliente.
3. Si cambia algo de lo que el **comprador** hace o recibe, la **guía del comprador** (landing, sección `#guia`; textos en `guide` de `src/i18n/es.ts` y `en.ts`) se actualiza en el mismo cambio, en los dos idiomas. Una prueba (`tests/guide.test.ts`) impide que un idioma quede a medias o que la guía prometa algo que la plataforma aún no hace.
4. Si trata datos personales, la política de privacidad refleja el nuevo uso (`src/lib/legal/`).
5. Las capturas de pantalla de las guías se generan al final con las pruebas E2E, no a mano.
6. Los **videos de apoyo** de las guías (cortos, sin sonido, con subtítulos, entre 250 KB y 1,5 MB cada uno, en WebM y MP4) se graban con Playwright (`pnpm videos`; guiones en `e2e/videos/`) y se regeneran cuando cambia la pantalla que muestran (`pnpm videos` graba y comprime todo; `pnpm videos:encode` solo recomprime); nunca llevan datos de clientes reales. Los de la guía del equipo van en `docs/guia-equipo/videos/` y se insertan con `![Video: título](video:nombre)`; los del comprador, en `public/guia/` (es/en). Esto es de mantenimiento: la guía no lo explica.

## Accessibility & Inclusion
Contraste alto apto para uso bajo luz solar, objetivos táctiles amplios, soporte multi-idioma, accesibilidad por teclado y lector de pantalla (objetivo WCAG AA).

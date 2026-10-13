# 6 · Avisos al cliente

**Para qué sirve:** saber qué correos le llegan al cliente, cuándo, y cómo comprobar que salieron.
**Quién puede hacerlo:** administración y gestión.

> **WhatsApp es siempre manual.** La plataforma no envía mensajes de WhatsApp por su cuenta; solo prepara el mensaje para que tú lo mandes.

## Qué correos recibe el cliente

| Cuándo | Cómo se dispara | Asunto (en español) |
|--------|-----------------|---------------------|
| Le mandas el enlace de su cotización | **Tú**, con el botón **Enviar por correo** del panel *Enlace para el cliente* | «Tu cotización de Zeus está lista» |
| Se aprueba su solicitud | **Automático** al pulsar **Aprobar** | «Tu cotización de Zeus fue aprobada» |
| Su proyecto avanza de etapa | **Automático** al mover el proyecto hacia delante | «Tu proyecto solar avanzó: Visita técnica / Diseño de ingeniería / Instalación / Monitoreo» |
| Quieres darle (o reenviarle) el enlace de su portal | **Tú**, con **Enviar por correo** en el panel *Portal del cliente* del proyecto | «Sigue tu proyecto solar con Zeus» |

Los correos de aprobación y de cambio de etapa llevan además el botón **Ver mi proyecto**, que abre su [portal](07-portal-del-cliente.md).

Reglas de los avisos automáticos:
- **Solo avanzando.** Mover un proyecto hacia atrás no envía nada.
- **Una vez por etapa.** Si ya se envió bien el aviso de esa etapa, no se repite.
- **No se avisa de «Prospecto».**
- Solo en proyectos que nacieron de una cotización y con el interruptor **«Avisar al cliente…»** activo (pestaña *Resumen* del proyecto).
- El correo sale **en el idioma en que el cliente pidió su cotización**, no en el tuyo.
- No hay correo al descartar una solicitud: eso se habla con el cliente.
- Nadie recibe correos por llenar el formulario del simulador: solo el equipo, ya autenticado, puede disparar avisos.

## Qué correos recibe el equipo

| Cuándo | Quién | Asunto |
|--------|-------|--------|
| El cliente acepta o rechaza desde su enlace | Administración y gestión (cuentas activas) | «{Cliente} aceptó / no aceptó la cotización» |
| Alguien pide restablecer su contraseña | Esa persona | «Restablece tu contraseña de Zeus» |

## Cómo comprobar que un aviso salió

Abre la solicitud y mira el **Historial**. Cada intento aparece como **«Aviso al cliente»** con uno de estos resultados:

| Resultado | Significa | Qué hacer |
|-----------|-----------|-----------|
| *enviado por correo* | Resend lo aceptó para entregarlo. | Nada. |
| *no se pudo enviar* | Falló el envío (servicio caído, dirección rechazada…). | Si era el enlace, reintenta con **Enviar por correo** o usa WhatsApp. Si era un aviso de etapa o de aprobación, **contacta al cliente por teléfono o WhatsApp**: no se reenvía solo. |
| *correo sin configurar (no se envió)* | El envío de correos no está activo en este entorno. | Avisar a quien administra la plataforma; mientras tanto, contacta al cliente por WhatsApp. |

## Si te equivocaste

- **Moviste un proyecto hacia delante por error y ya salió el correo:** no se puede retirar. Escríbele al cliente y aclara; vuelve el proyecto a su etapa (no enviará otro correo al retroceder).
- **Quieres mover etapas sin avisar** (por ejemplo, para ordenar datos): apaga el interruptor **«Avisar al cliente…»** antes y vuelve a encenderlo después.
- **El cliente dice que no le llegó:** revisa el Historial; pídele que mire la carpeta de correo no deseado; confirma que su correo en la solicitud sea el correcto.

## Reglas que no se saltan
- Los correos son sobre **su solicitud**, nunca publicidad.
- No prometas en el correo ni por chat fechas o precios que no estén en la cotización.

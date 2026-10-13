# 4 · Proyectos

**Para qué sirve:** llevar cada instalación aprobada de la visita técnica al monitoreo: etapa, cronograma, materiales, alertas y el enlace de la app del inversor.
**Quién puede hacerlo:** administración y gestión gestionan todo; el **equipo de instalación** ve solo los proyectos de su equipo y reporta avance, materiales y alertas.
**Dónde está:** menú **Proyectos**.

## De dónde salen los proyectos

Los proyectos **no se crean a mano**: nacen solos al **aprobar** una solicitud con instalación ([sección 2](02-solicitudes-y-cotizacion.md)). Traen el cliente, la ciudad, la potencia (kWp), el equipo asignado y los materiales del kit, y arrancan en **Visita técnica** con 30 días de plazo de entrega.

## Las etapas

`Prospecto → Visita técnica → Diseño de ingeniería → Instalación → Monitoreo`

La pantalla ofrece dos vistas: **Tablero** (columnas por etapa) y **Lista**.

### Mover un proyecto de etapa (gestión y administración)

- **Tablero:** arrastra la tarjeta a otra columna. Con teclado: espacio para tomarla, flechas para elegir la etapa, espacio para soltarla (Escape cancela).
- **Lista o tarjeta:** usa **Mover a**.

> 📧 **Al avanzar de etapa, al cliente le llega un correo** (si el proyecto nació de una cotización y el aviso está activo). Mover hacia atrás **nunca** envía correo. Piénsalo antes de arrastrar: un correo enviado no se puede retirar. Ver [Avisos al cliente](06-avisos-al-cliente.md).

## El expediente del proyecto

Abre un proyecto con **Abrir expediente**. Tiene cinco pestañas (la de **Instalación** se explica en la [sección 10](10-modo-campo.md)).

### Resumen
Cliente, potencia, responsable, equipo (con su WhatsApp), lo que cobra el equipo (solo gestión) y un enlace a la **solicitud de origen**. Si el proyecto nació de una cotización verás el interruptor **«Avisar al cliente por correo cuando el proyecto avance de etapa»**: apágalo si quieres mover etapas sin que el cliente reciba correos (por ejemplo, para corregir un error de captura). Debajo está el panel **Portal del cliente** ([sección 7](07-portal-del-cliente.md)): lo que registres en el cronograma y los materiales es lo que el cliente ve ahí.

### Cronograma
1. **Generar cronograma:** elige **¿Cuándo empieza el proyecto?** y la plataforma crea los hitos típicos según el tipo de sistema (con o sin baterías, con o sin trámite del operador de red) y el tamaño.
2. Edita lo que haga falta: **Agregar hito**, cambiar nombre, inicio, días y cuadrilla (A, B o Ingeniería), o **Quitar** (solo gestión).
3. Registra el avance de cada hito en **Avance (%)**: escribe el número y pulsa Enter. Cada hito se muestra como *Hecho*, *En curso*, *Atrasado* o *Pendiente*.

> El equipo de instalación **solo puede cambiar el avance**; fechas, nombres y cuadrillas son de gestión.

### Materiales
La lista sale del kit de la cotización. Marca cada material cuando esté **listo**, o usa **Marcar todos**. Verás cuántos van «listos de N».

Si llevas inventario propio ([sección 11](11-inventario.md)), cada material muestra **de dónde sale** (*Del inventario propio* o *Pedir al proveedor*): al marcarlo como listo, lo que sale del inventario se descuenta, una sola vez. El **margen del kit** aparece en el Resumen, solo para gestión y administración.

### Instalación
Lo que el equipo hizo en obra: **checklist** (quién y cuándo), **fotos** y el **acta de entrega** firmada. Es el mismo trabajo que se hace desde el celular en modo campo ([sección 10](10-modo-campo.md)).

### Documentos
Planos, permisos, certificados y contratos del proyecto. **Gestión** los sube (PDF o imagen JPG, PNG o WebP, de hasta **4 MB**; hasta 40 por proyecto); el equipo de instalación puede verlos y descargarlos, pero no subir, cambiar ni borrar.

- **Subir un documento:** elige el archivo, el **tipo** y un nombre claro (si lo dejas vacío usa el nombre del archivo). El tipo real se comprueba por el contenido: un archivo que no sea PDF ni imagen se rechaza aunque se llame `.pdf`.
- **Privados por defecto.** Solo los ve el personal. Para que el cliente lo vea en su portal ([sección 7](07-portal-del-cliente.md)) usa **Compartir con el cliente** (o márcalo al subirlo); **Dejar de compartir** lo quita del portal al instante.
- **Eliminar** pide confirmación y borra también el archivo.

> 🔒 Comparte con el cliente solo lo que él deba tener (certificados, permisos aprobados, planos finales). No compartas contratos con precios internos ni borradores.

### Monitoreo
Empieza cuando el sistema está instalado.

- **Enlace a la app o nube del inversor** (Growatt, Deye, Fronius…): pega el enlace donde se ve el sistema y, si quieres, el usuario o id de la planta. **Solo enlaces `https://`.** Lo agrega gestión.
- **Alertas:** **Registrar alerta** con *¿Qué pasó?* y la **Gravedad** (Alta, Media o Baja). Cuando se resuelve, **Marcar atendida** (queda quién y cuándo); se puede **Reabrir**. Eliminar alertas es de gestión.

> 🔒 No escribas contraseñas de clientes en el enlace, la nota ni las alertas.

## Errores y dudas frecuentes

> Documentos: si al subir dice «pesa más de 4 MB», comprime el PDF o expórtalo con menos calidad; si dice «solo se aceptan PDF e imágenes», convierte el archivo (Word, Excel y similares no se admiten).

| Si ves… | Significa… | Qué hacer |
|---------|-----------|-----------|
| «No se pudo mover el proyecto» | Falló el guardado o alguien lo movió a la vez. | Recarga y vuelve a intentar. |
| No veo ningún proyecto (rol equipo) | Gestión aún no asignó proyectos a tu equipo. | Avisa a gestión. |
| El proyecto no tiene cronograma | Aún no se generó. | Pestaña **Cronograma → Generar cronograma**. |

## Reglas que no se saltan
- Registra el avance el mismo día: el cliente y gestión deciden con esos números.
- Si algo falla en campo, **registra una alerta** en vez de avisar solo por chat: queda el historial.
- No muevas etapas «por orden»: cada avance de etapa es una promesa al cliente.

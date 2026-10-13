# 2 · Solicitudes y cotización

**Para qué sirve:** atender al cliente desde que pide la cotización hasta que la acepta, y dejar todo registrado.
**Quién puede hacerlo:** administración y gestión.
**Dónde está:** menú **Solicitudes**.

## El recorrido de una solicitud

```
Nueva → Contactada → Cálculo confirmado → Aprobada  (crea el proyecto)
   ↘          ↘               ↘
                Descartada  (se puede Reabrir)
```

| Estado | Qué significa | Qué te toca |
|--------|---------------|-------------|
| **Nueva** | Nadie ha hablado con el cliente. | Hablar con el cliente (el teléfono abre WhatsApp) y marcarla **contactada**. |
| **Contactada** | Ya hay contacto; falta validar el cálculo. | Revisar con el cliente el consumo y el kit, ajustar el kit si hace falta y **confirmar el cálculo**. |
| **Cálculo confirmado** | El cálculo quedó validado. Falta que el cliente acepte. | Mandarle el enlace de su cotización y esperar su respuesta. |
| **Aprobada** | El cliente aceptó y tú lo registraste. | Se creó el proyecto (si hay instalación). Sigue con la visita técnica. |
| **Descartada** | No avanzó. | Obligatorio explicar el motivo. Se puede **Reabrir**. |

Cada cambio queda en el **Historial** con quién lo hizo y cuándo.

> 📞 **Notas, recordatorios y origen:** cada solicitud tiene un panel **Seguimiento** para anotar lo que hablan, agendar cuándo volver a llamar y corregir de dónde llegó el cliente. Se explica en la [sección 8](08-seguimiento.md).

## 1 · Atender una solicitud nueva

1. Abre la solicitud desde la lista (puedes filtrar por estado en las pestañas).
2. Revisa los datos de la factura, el dimensionamiento y el kit que armó el cliente.
3. Habla con él. Anota lo importante en el campo **Nota** y pulsa **Marcar como contactada**.
4. **Agenda el siguiente paso:** en el panel **Seguimiento**, crea un recordatorio (por ejemplo, «Llamar para confirmar el consumo»).

## Apoyo · Explicarle al cliente el comparador de escenarios

En el simulador, justo antes de pedir la cotización, hay una sección **«Compara escenarios»** (botón **Comparar tamaños y financiación**). Muestra el mismo recibo con distintos tamaños (cubrir el 50 %, 75 % o 100 % del consumo, más el que el cliente eligió) y, en cada uno, **al contado** y **financiado**. Puedes pedirle al cliente que lo abra mientras hablan, o abrirlo tú con su enlace de cálculo guardado.

| Dato de la tarjeta | Cómo explicarlo |
|--------------------|-----------------|
| **Recuperas la inversión en** | Años que tarda el ahorro en igualar el precio del kit (al contado). |
| **Ganancia neta a 15 años** | Ahorro acumulado en 15 años menos lo que paga. Es la cifra para comparar tamaños. |
| **Retorno a 15 años** | La ganancia neta como porcentaje de lo que paga. |
| **Tu ahorro cubre la cuota y sobran… / La cuota supera tu ahorro por…** | Si financia, cuánto le sobra o le falta cada mes después de pagar la cuota con lo que ahorra. |
| **Total que pagas (con intereses)** | Cuota inicial más todas las cuotas. Por eso financiado se gana menos que al contado. |

Qué tener en cuenta:
- Las insignias («Se recupera más rápido», «Mayor ganancia…») solo comparan entre las tarjetas visibles.
- **Si dos tamaños terminan en el mismo kit** (los paneles se venden por paquetes) se muestra **una sola tarjeta**, y lo dice. Es normal.
- El cliente puede pulsar **Usar este tamaño** y su cálculo se actualiza. Si cambia la cuota inicial o el plazo, todas las tarjetas se recalculan.
- Los supuestos están al pie y **son una estimación**: tarifa constante, paneles que pierden ≈0,25 % al año, sin mantenimiento ni reemplazo del inversor. No prometas cifras exactas; la cotización la valida el asesor.
- La tasa de financiación es una referencia del mercado, nunca pasa del tope de usura. **No es un crédito aprobado.**

## 2 · Ajustar el kit

Mientras la solicitud no esté aprobada ni descartada puedes **Ajustar kit**: cambiar productos o cantidades, agregar o quitar. Los precios salen siempre del catálogo vigente. La plataforma guarda el kit original del cliente y marca que fue ajustado.

> Si ajustas el kit **después** de haber mandado el enlace, el cliente ya no podrá aceptar el valor viejo: tendrá que recargar la página y ver el valor actual.

## 3 · Modalidad y equipo

- **Modalidad:** *Con instalación* o *Solo kit*. La plataforma la propone según si hay un equipo que cubra la zona del cliente; puedes cambiarla.
- **Equipo:** si hay instalación, elige el equipo (aparecen ordenados por cercanía a la obra, con una marca si queda fuera de su radio o si está lleno).
- **Antes de aprobar con instalación debes asignar un equipo disponible.** Verifica con el equipo que puede tomar el trabajo en las fechas necesarias; por eso aprobar no es automático (ver más abajo).

## 4 · Confirmar el cálculo y mandar la cotización

1. Pulsa **Confirmar el cálculo**.
2. En el panel **Enlace para el cliente**:
   - **Descargar PDF:** la cotización lista para enviar o archivar.
   - **Generar enlace:** crea una página privada donde el cliente ve su cotización, descarga el PDF y dice si la acepta. El enlace **vale 15 días**.
3. Envía el enlace al cliente:
   - **Enviar por correo:** le llega un correo con el botón **Ver mi cotización**.
   - **Enviar por WhatsApp:** abre WhatsApp con el mensaje ya escrito; tú lo envías a mano.
   - **Copiar enlace:** para pegarlo donde prefieras.

> ⚠️ **El enlace solo se muestra una vez**, al generarlo. Cópialo o envíalo antes de salir de la pantalla. Si lo pierdes, usa **Generar enlace nuevo**: el anterior deja de funcionar y se borra la respuesta que el cliente hubiera dado.

## 5 · La respuesta del cliente

Cuando el cliente abre su enlace puede **Aceptar cotización** o **No por ahora** (con un motivo opcional). Tú verás:

- Una etiqueta **«El cliente aceptó»** (o «no aceptó») con fecha, en el panel del enlace y en el Historial.
- Un correo de aviso a administración y gestión.

> **Que el cliente acepte NO aprueba la solicitud.** Sigue en *Cálculo confirmado*. La aprobación la haces tú, después de validar que el equipo está disponible. Es una decisión consciente: evita crear proyectos por un clic y obliga a revisar la disponibilidad.

## 6 · Aprobar

1. Si hay instalación, comprueba que **hay un equipo asignado** y que puede tomar el trabajo.
2. Pulsa **Aprobar: el cliente aceptó**. **No se puede deshacer.**
3. Qué pasa:
   - Con instalación: se crea el **proyecto** automáticamente (con los materiales del kit) y arranca en *Visita técnica*.
   - Solo kit: no se crea proyecto; la solicitud termina como venta del kit.
   - El enlace del cliente se cierra (ya no admite respuesta).
   - Al cliente le llega el correo **«Tu cotización de Zeus fue aprobada»** (ver [Avisos al cliente](06-avisos-al-cliente.md)).

## 7 · Descartar y reabrir

**Descartar** pide siempre un motivo (precio, no contesta, compró a otro…). Sirve para entender por qué se pierden ventas. Una solicitud descartada se puede **Reabrir**: vuelve a *Contactada*.

## Errores y dudas frecuentes

| Si ves… | Significa… | Qué hacer |
|---------|-----------|-----------|
| «Asigna un equipo antes de aprobar…» | La modalidad es con instalación y no hay equipo. | Asigna uno en **Contacto → Equipo**, o cambia a *Solo kit*. |
| «Alguien más cambió la solicitud» | Otra persona la modificó al mismo tiempo. | Recarga y vuelve a intentar. |
| No aparece **Generar enlace** | La solicitud no está en *Cálculo confirmado*. | Confírmala primero. |
| El cliente dice que el enlace «venció» | Pasaron más de 15 días, o la solicitud ya no está en *Cálculo confirmado*. | Genera un enlace nuevo (si corresponde). |
| El cliente dice que «la cotización cambió» | Ajustaste el kit después de enviarle el enlace. | Que recargue la página y revise el valor actual. |

## Reglas que no se saltan
- No aprobar sin que el cliente haya aceptado (en su enlace o por un canal que dejes anotado en la **Nota**).
- No aprobar con instalación sin haber confirmado la disponibilidad del equipo.
- No mandar el enlace de una cotización a otra persona que no sea el cliente.

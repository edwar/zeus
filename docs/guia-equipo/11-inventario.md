# 11 · Inventario y margen

**Para qué sirve:** llevar la cuenta de los productos que **tú compras para tener en bodega**, saber cuándo se están acabando y ver cuánto ganas en cada proyecto. Convive con los productos del proveedor (Autosolar): esos **no** se cuentan aquí, se piden cuando se aprueba la cotización.
**Quién puede hacerlo:** administración y gestión. El equipo de instalación **nunca** ve inventario, costos ni márgenes.
**Dónde está:** menú **Inventario**; el margen, en el **Resumen** de cada proyecto; el origen de cada material, en la pestaña **Materiales** del proyecto.

## Dos formas de tener un producto

| | Del proveedor (Autosolar) | De tu inventario |
|---|---|---|
| Quién tiene las unidades | El proveedor | Tú, en bodega |
| Cuándo se pide | Al aprobar la cotización | Ya lo tienes |
| Disponibilidad que ve el cliente | La del proveedor | Mientras te queden unidades |
| Costo | El precio de proveedor que trae la sincronización | El costo **promedio** de lo que compraste |

Un mismo producto de Autosolar puede ser las dos cosas: compras un lote para tenerlo en bodega y, cuando se acabe, vuelve a pedirse al proveedor.

## Empezar a llevar inventario de un producto

![Video: empezar a llevar inventario y registrar una compra](video:11-inventario)


1. **Inventario → Llevar inventario de un producto.**
2. Busca el producto por nombre, referencia o fabricante y elígelo.
3. Escribe cuántas **unidades tienes hoy** y el **costo por unidad** (lo que te costó a ti, sin tu ganancia), y desde cuántas unidades quieres que avise **«Stock bajo»**.
4. **Empezar a llevar inventario.**

> Si todavía no tienes unidades, deja 0: las registras con la primera entrada.

## El día a día

- **Registrar entrada:** cuando compras. Pon las unidades que llegaron y su costo; verás cómo queda el **costo promedio** antes de guardar. Ejemplo: tienes 5 a $600.000 y llegan 5 a $800.000 → quedan 10 a $700.000.
- **Contar:** cuando cuentas la bodega y no coincide con el sistema. Escribe las unidades que hay **realmente** y el **motivo** (es obligatorio: así se pueden cuadrar diferencias). Se anota la diferencia, no se borra nada.
- **Historial:** todas las entradas, conteos y salidas a proyectos, con quién y cuándo. **No se pueden editar ni borrar.**
- **Mínimo:** se edita en la misma fila. Con esa cantidad o menos aparece **Stock bajo**; sin unidades, **Agotado**.
- **Quitar:** deja de llevar inventario del producto (el historial se conserva). No se puede si algún proyecto tiene unidades de ese producto descontadas.

## Qué pasa con los proyectos

Cuando se aprueba una cotización, cada material del proyecto queda con un **origen**:
- **Del inventario propio**, si el producto lleva inventario y alcanzan las unidades.
- **Pedir al proveedor**, en cualquier otro caso.

Puedes cambiarlo en **Proyecto → Materiales**. El material **solo se descuenta cuando se marca como listo** (desde la oficina o desde el modo campo), una sola vez; si lo desmarcas, la unidad vuelve al inventario. Mientras no se marque, aparece como **«Pedido en proyectos»** en la tabla de inventario, para que no se te olvide que ya está comprometido.

> Si marcas un material como listo y no alcanzan las unidades, el inventario queda en **negativo** y avisa como agotado: no se bloquea al equipo en obra, pero tienes que contar y comprar.

## El margen de un proyecto

En el **Resumen** del proyecto aparece **Margen del kit**: lo que se vendió menos lo que costó.
- Un material **del proveedor** cuesta lo que costaba ese producto en el proveedor **cuando se aprobó** la cotización.
- Un material **del inventario** cuesta el costo promedio **al descontarlo**; mientras no se descuente, se estima con el promedio de hoy y se avisa.
- Es solo el **kit**: no incluye la instalación ni otros gastos.
- Si a algún material le falta precio o costo (por ejemplo, proyectos creados antes de que existiera esta función), el margen es **parcial** y lo dice.

## Lo que ve el cliente

El cliente solo ve si un producto está **disponible o agotado**, nunca cuántas unidades tienes ni cuánto te costó. Si el proveedor no tiene un producto pero tú sí, se ofrece; si se acaban tus unidades, vuelve a depender del proveedor.

## Errores y dudas frecuentes

| Si ves… | Significa… | Qué hacer |
|---------|-----------|-----------|
| «Ese producto ya lleva inventario» | Ya lo habías agregado. | Búscalo en la tabla y registra la entrada ahí. |
| «No se puede quitar: hay proyectos…» | Hay unidades de ese producto descontadas en algún proyecto. | Cambia el origen de esos materiales a **Pedir al proveedor** (devuelve las unidades) y vuelve a intentarlo. |
| «El conteo es igual a las existencias» | No hay diferencia que anotar. | Nada: ya está cuadrado. |
| Existencias en negativo | Se marcaron más materiales de los que había. | **Contar**, o **Registrar entrada** si ya llegó la compra. |
| Margen «parcial» | Faltan precios o costos de algún material. | Revisa el costo del producto en el proveedor o en tu inventario. |

## Reglas que no se saltan
- Cuenta la bodega con regularidad y anota siempre el motivo de cada diferencia.
- Registra la entrada el mismo día que llega la compra, con el costo real.
- No compartas el margen ni los costos con el cliente ni con el equipo de instalación.

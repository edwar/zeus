# 5 · Productos y catálogo

**Para qué sirve:** mantener los productos y precios con los que se arman los kits del simulador y las cotizaciones.
**Quién puede hacerlo:** solo administración.
**Dónde está:** menú **Productos** y **Fabricantes**.

## De dónde salen los productos

- **Importados de Autosolar:** se traen y actualizan solos (nombre, descripción, ficha técnica, precio de Autosolar). Se sincronizan **cada noche**; también puedes lanzarlo a mano con **Sincronizar con Autosolar** (si se interrumpe, al volver a lanzarlo continúa donde quedó).
- **Manuales:** los creas tú con **Nuevo producto** (requiere un fabricante).

## Cómo se calcula el precio de venta

`precio de venta = precio de Autosolar + comisión`

- **Comisión global (%):** se suma al precio de Autosolar de todos los productos importados. Al cambiarla con **Guardar**, se recalculan los precios y la pantalla dice cuántos.
- **Comisión propia (%):** en un producto concreto, anula la global. Déjala vacía para usar la global.

> ⚠️ Cambiar la comisión global cambia los precios de **todo** el catálogo importado. Los kits y las cotizaciones **ya creadas** conservan el precio de cuando se cotizaron.

## Gestionar un producto

Abre un producto desde la lista. Puedes:
- Ajustar la **comisión propia**.
- **Visible en el catálogo:** si lo apagas, no aparece para los clientes ni entra en kits nuevos.
- **Disponible:** marca si está agotado.
- En productos manuales: nombre, precio de venta, categoría, SKU, descripción, ficha técnica (enlace a PDF), especificaciones e imágenes.
- **Eliminar producto**: no se puede deshacer.

En un producto importado, nombre, descripción y ficha **se sobrescriben** en cada sincronización: no los edites a mano.

## Fabricantes

Se crean solos al importar, o con **Nuevo fabricante**. Un fabricante con productos no se puede eliminar.

## Errores y dudas frecuentes

| Si ves… | Significa… | Qué hacer |
|---------|-----------|-----------|
| «Primero crea un fabricante» | Quieres crear un producto manual sin fabricante. | Crea el fabricante en **Fabricantes**. |
| «La sincronización se interrumpió» | Se cortó a la mitad. | Vuelve a lanzarla: continúa donde quedó. |
| Un producto no aparece en el simulador | Está oculto o no tiene precio de venta. | Revisa **Visible en el catálogo** y el precio. |
| Las imágenes no se copian | Falta configurar el almacenamiento. | Avisar a quien administra la infraestructura. |

## Reglas que no se saltan
- Revisa el precio de venta de un producto nuevo antes de dejarlo visible.
- No cambies la comisión global en horas de atención: mueve todos los precios.

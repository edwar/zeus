---
name: Zeus
description: Plataforma solar y domótica donde la sombra de una celosía tropical se vuelve ahorro medible.
colors:
  canopy: "#0e2f23"
  canopy-deep: "#082017"
  canopy-line: "#24493a"
  emerald: "#14805a"
  emerald-deep: "#0d6044"
  leaf: "#8be0b0"
  sun: "#f5b82e"
  sun-soft: "#fff0c7"
  sun-ink: "#7a4f00"
  sky: "#1f6fb2"
  sky-on-dark: "#7cc0f5"
  paper: "#f4f7f5"
  mist: "#e6ece8"
  line: "#cfd9d3"
  ink: "#11201a"
  ink-soft: "#435850"
  alert: "#b3361b"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(2.3rem, 5.6vw, 4.4rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Bricolage Grotesque, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(1.7rem, 3.4vw, 2.6rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
  caption:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 600
  micro:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
rounded:
  sm: "2px"
  md: "6px"
  lg: "10px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "32px"
  xl: "72px"
components:
  button-primary:
    backgroundColor: "{colors.emerald}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "11px 22px"
    height: "46px"
  button-sun:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.canopy-deep}"
    rounded: "{rounded.md}"
    padding: "11px 22px"
  input:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "46px"
---

# Design System: Zeus

## Overview

**Creative North Star: "La Celosía"**

Zeus toma su mundo de la arquitectura tropical: la celosía y el brise-soleil, el muro perforado que deja pasar el aire y detiene el sol. La retícula del producto es una celosía: listones verticales de bosque profundo con aberturas por donde se cuela la luz. En el portal, la luz se mueve con la hora del día y compara la generación solar con el consumo de una casa, oficina, local o taller. En la operación, la celosía se vuelve disciplina: retícula clara, superficies luminosas, color reservado para el estado.

Escena de uso: cliente en casa, por la tarde y con calor, en móvil o portátil (portal oscuro por decisión de mundo: la sombra); técnico en campo bajo sol directo, una mano, conexión irregular (operación clara, alto contraste, objetivos táctiles de 44px o más).

**Key Characteristics:**
- Estrategia de color **Drenched** en el portal (bosque como suelo) y **Restrained** en la operación.
- Un solo motivo gráfico: listones verticales (14px de listón, 12px de abertura).
- El color significa dato: amarillo = luz y generación, azul = consumo, verde = acción y avance.

## Colors

Bosque profundo con una única luz cálida; neutros verdosos, nunca grises puros.

### Primary
- **Bosque de dosel** (#0e2f23): suelo del portal, barra lateral y navegación inferior operativa.
- **Esmeralda de acción** (#14805a / hover #0d6044): botón primario, avance, casillas marcadas.

### Secondary
- **Luz solar** (#f5b82e): generación, foco, estado activo de navegación y cierre del portal. Texto sobre él: bosque profundo (#082017).
- **Azul de consumo** (#1f6fb2; #7cc0f5 sobre fondos oscuros): consumo y demanda de energía.

### Neutral
- **Papel verdoso** (#f4f7f5): fondo operativo. **Bruma** (#e6ece8): columnas y fondos de sección. **Tinta** (#11201a) y **Tinta suave** (#435850) para texto. **Línea** (#cfd9d3).
- **Alerta** (#b3361b): bloqueos y alertas altas únicamente.

### Named Rules
**The Light-Is-Data Rule.** El amarillo solo representa luz o generación; nunca decora.
**The One-Warm-Light Rule.** En cada pantalla hay una sola zona amarilla dominante.

## Typography

**Display Font:** Bricolage Grotesque (con Segoe UI, system-ui)
**Body Font:** Inter (con system-ui). Cifras tabulares globales.

**Character:** display con carácter y compacto para el portal; Inter, neutro y legible, para datos y operación.

### Hierarchy
- **Display** (800, clamp 2.3–4.4rem, 1.02): titular del portal.
- **Headline** (800, clamp 1.7–2.6rem, 1.1): secciones.
- **Title** (700, 1.05–1.5rem): tarjetas, paneles.
- **Body** (400, 1rem, 1.55): 65–75ch.
- **Label** (600, 0.875rem), **Caption** (600, 0.8rem) y **Micro** (700, 0.75rem): campos, metadatos y rótulos de gráfico. Pasos intermedios de 0.85–0.95rem se usan en navegación y tablas como variantes del label. Sin mayúsculas tracked.

## Layout

Mobile-first. Portal: columna de hasta 76rem con rejilla 1.1fr/0.9fr en el hero. Operación: barra lateral de 15rem en escritorio; en móvil, barra inferior de 3 pestañas (4.5rem). Kanban de 5 columnas con scroll horizontal y ajuste en móvil. Ritmo vertical de 72px entre secciones.

## Elevation & Depth

Tonal y plano. Sin sombras difusas; la profundidad es luz y sombra de listones (sombra dura lateral de 6px al 16%, solo en el pulgar del control de rango).

## Shapes

Esquinas de 2–10px, aberturas rectangulares, listones rectos. Sin cápsulas. Un borde superior de 6px identifica etapa o tipo de ficha; no se usan bordes laterales de color en tarjetas.

## Components

### Buttons
- **Primary (esmeralda):** blanco sobre #14805a, 46px de alto, radio 6px.
- **Sun:** bosque profundo sobre luz solar; solo sobre fondos oscuros o el cierre.
- **Ghost:** borde de 2px, para acciones secundarias.

### Inputs / Fields
Borde 1.5px #9fb0a7, radio 6px, 46px de alto; foco con anillo esmeralda. Error en alerta con texto de recuperación.

### Range (listón sobre riel)
Pulgar rectangular de 18×34px sobre un riel de 10px; en el portal, el pulgar es solar sobre riel de bosque.

### Navigation
Portal: barra bosque profundo, enlace actual subrayado en luz solar. Operación: lateral con actual en luz solar; inferior en móvil.

### Tarjeta de proyecto
Ficha blanca con nombre, cliente·localidad·responsable, barra de avance de 8px, capacidad y entrega, y selector «Mover a» accesible (alternativa al arrastre).

### Instrumento de celosía (firma)
Ventana de listones con luz solar que se desplaza según la hora, debajo curva de generación (amarillo) frente a demanda de A/A (azul) con marcador de hora y control de recorrido.

## Do's and Don'ts

### Do:
- **Do** usar amarillo para luz/generación y azul para consumo en todo gráfico, con leyenda.
- **Do** etiquetar como demostración cualquier cifra o contenido comercial no real.
- **Do** mantener objetivos táctiles de 44px o más en la operación.

### Don't:
- **Don't** anidar tarjetas ni usar degradado en texto.
- **Don't** usar fotos de paneles de stock ni íconos genéricos de hoja o bombilla.
- **Don't** inventar precios, clientes ni garantías.

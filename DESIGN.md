---
name: Zeus
description: Plataforma solar y domótica con espíritu de puesto de frutas tropicales: el sol es el ingrediente, el color es plano y jugoso.
colors:
  maracuya: "#ffc21a"
  maracuya-soft: "#fff1b8"
  maracuya-ink: "#5c3b00"
  lima: "#c8f24b"
  lima-soft: "#eefcc4"
  cielo: "#2352e6"
  cielo-soft: "#dfe8ff"
  mango: "#ff7a2f"
  selva: "#06251b"
  selva-deep: "#031811"
  selva-line: "#174a39"
  esmeralda: "#0a7f55"
  esmeralda-deep: "#07603f"
  tinta: "#0b1f18"
  tinta-soft: "#3d544b"
  lienzo: "#eef4f0"
  niebla: "#e4eee8"
  linea: "#d3e0d9"
  blanco: "#ffffff"
  alerta: "#c8321b"
typography:
  display:
    fontFamily: "Gabarito, system-ui, sans-serif"
    fontSize: "clamp(2.8rem, 7vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Gabarito, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4.4vw, 3.4rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 700
rounded:
  sm: "8px"
  md: "14px"
  lg: "24px"
  xl: "36px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "40px"
  xl: "88px"
components:
  button-primary:
    backgroundColor: "{colors.maracuya}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pill}"
    height: "52px"
  button-secondary:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pill}"
    height: "52px"
  input:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    height: "48px"
---

# Design System: Zeus

## Overview

**Creative North Star: "Fruta de Sol"**

Zeus se ve y se siente como un puesto de frutas y refrescos tropicales donde el ingrediente es el sol: color plano, jugoso y saturado, formas redondeadas como gajos y píldoras, pegatinas inclinadas y una tapa de botella que se presiona. Reemplaza el portal verde bosque casi negro y la celosía de listones del diseño anterior.

Escena de uso: cliente en casa, por la tarde y con calor, en móvil o portátil (portal claro y luminoso); técnico en campo bajo sol directo, una mano (panel claro, alto contraste, objetivos de 44px o más).

**Key Characteristics:**
- Estrategia de color **Full palette** en el portal (maracuyá, lima, cielo y selva como campos de color a escala de página) y **Restrained** en el panel (lienzo claro, selva para la barra, maracuyá como acento).
- Un motivo gráfico: el **disco solar** (círculo con contorno de tinta) y las **losas redondeadas** que se apilan entre secciones.
- El color significa dato: amarillo = sol y generación, azul = consumo, verde = avance y confirmación, naranja = atención.
- Texto siempre sobre tinta o blanco con contraste AA; el amarillo y la lima llevan tinta, nunca blanco.

## Colors

- **Maracuyá `#ffc21a`:** el sol. Campo del hero, botón principal, píldora activa del panel.
- **Lima `#c8f24b`:** frescura y confirmación. Campos de apoyo y cierre.
- **Cielo `#2352e6`:** consumo y domótica. Texto blanco encima (≥4.5:1).
- **Selva `#06251b`:** ancla oscura (pie, barra lateral, texto de gran contraste). Ya no es el suelo de todo el portal.
- **Esmeralda `#0a7f55`:** acciones secundarias y progreso sobre blanco.
- **Mango `#ff7a2f`:** acentos de atención y atardecer.
- **Lienzo `#eef4f0`:** fondo del panel; el portal usa blanco.

## Typography

- **Gabarito** (800) para titulares y números grandes: redondeada, geométrica y amistosa.
- **Figtree** para interfaz y cuerpo.
- Cuerpo 65–75ch; titulares equilibrados con `text-wrap: balance`.

## Shapes

Radios generosos: 14px en controles, 24px en tarjetas, 36px en losas de sección; botones, chips, pestañas e interruptores en píldora. Contornos de tinta de 2px en las superficies de persuasión y en todos los botones; las tarjetas y tablas del panel usan 2px de `linea` y sombra suave.

## Elevation & Depth

- **Botones (portal y panel):** sombra dura de tinta (`0 3px 0`), efecto tapa; al presionar se hunden 3px y pierden la sombra. Los botones `sm` e `icon` no llevan sombra.
- **Portal:** tarjetas y paneles de persuasión con contorno de tinta y sombra dura (`0 5–8px 0`); las secciones se apilan como losas redondeadas (margen negativo del tamaño del radio).
- **Panel:** `0 1px 2px` + `0 14px 28px -16px` de selva a baja opacidad; las tarjetas de proyecto ganan sombra dura al pasar el cursor.

## Components

- **Cabecera del portal:** píldora blanca flotante con contorno de tinta; sobre un hero o cabecera de color, el color sube por debajo de ella.
- **Hero:** campo de maracuyá con la escena interactiva *SolarDay* (casa con paneles, sol que recorre el cielo y gráfico generación vs. consumo) dentro de una tarjeta tipo pegatina.
- **Panel:** barra lateral flotante de selva con píldora amarilla activa; en móvil, barra inferior en píldora flotante.
- **Etiquetas pegatina:** píldora de lima inclinada 3° (por ejemplo, «Día típico, curvas ilustrativas»).
- **Carga:** `Loading` con marcadores que reutilizan la geometría real de tablas, tablero y paneles.

## Do's and Don'ts

- Sí: campos de color a escala de página, píldoras, números grandes en Gabarito, ilustraciones planas con contorno de tinta.
- No: degradados en texto, bordes laterales de color, tarjetas idénticas de icono + título + texto como estructura de página, blanco sobre amarillo o lima, texto sin contraste AA.
- Ilustraciones y datos de la escena del hero son demostrativos (curvas ilustrativas); no son datos reales de ningún cliente.

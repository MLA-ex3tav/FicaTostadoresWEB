# Design System · Fica Tostadores Web

Guía visual del sitio público y del panel. La fuente de verdad de los tokens es
`app/globals.css`; este documento describe cómo y por qué se usan.

> **Regla de diseño: minimalista.**
> La web es **plana**. Sin glow, sin halos, sin brillos, sin gradientes
> decorativos y sin sombras de color. Superficies planas, bordes sutiles, un
> único acento (`--orange`) y movimiento discreto. Ante la duda, menos.

## 1. Principios

- **Plano antes que vistoso.** Nada de `box-shadow` con color, `text-shadow`,
  `drop-shadow`, `filter: blur` decorativo, gradientes ni animaciones de pulso.
- **Un solo acento.** El naranja `#e85d04` se reserva para acciones primarias y
  estados activos. No se usa para decoración masiva.
- **Bordes sutiles.** La separación se logra con `border-white/[0.06–0.10]` y
  cambios de superficie, no con sombras llamativas.
- **Jerarquía tipográfica.** Display en Petrona, cuerpo en Inter.
- **Calma en movimiento.** Transiciones cortas (150–320 ms) con
  `cubic-bezier(0.22, 1, 0.36, 1)`; nunca movimiento constante. Respetar
  `prefers-reduced-motion`.
- **Accesibilidad.** Foco visible, contraste AA, áreas táctiles ≥ 44 px.

## 2. Prohibido (anti-slop)

- `box-shadow` de color o "glow" (p. ej. `shadow-[0_12px_30px_rgba(37,211,102,.8)]`).
- Gradientes decorativos (`bg-gradient-to-*`). Solo se permiten si son
  funcionales y planos visualmente.
- Anillos/`animate-ping`/`animate-pulse` decorativos en botones.
- Radios exagerados (`rounded-full` en superficies grandes).
- Efectos `hover` de escala/rotación marcados; basta un cambio de color o borde.

## 3. Color

| Token           | Valor      | Uso                              |
| --------------- | ---------- | -------------------------------- |
| `--panel`       | `#1b1917`  | Paneles, tarjetas flotantes      |
| `--surface`     | `#26221f`  | Superficies elevadas             |
| `--input-bg`    | `#0e0c0a`  | Campos de formulario             |
| `--orange`      | `#e85d04`  | Acento / acción primaria         |
| `--orange-hover`| `#ff6b0a`  | Hover del acento                 |
| `--steel-light` | `#efe9e2`  | Texto principal                  |
| `--steel-mid`   | `#c9c0b5`  | Texto secundario                 |
| `--steel-dark`  | `#a39a8d`  | Pistas, placeholders             |

La base oscura es un grafito cálido (`#121110`), con neutros derivados del
tueste (marrón apagado) en lugar de grises azulados.

Colores de marca externos (p. ej. el verde WhatsApp `#25D366`) se usan en su
color corporativo **plano**, sin sombras ni degradados.

## 4. Forma y espacio

- Radios: `--radius-sm 0.25rem`, `--radius-md 0.375rem`, `--radius-lg 0.5rem`,
  `--radius-xl 0.75rem`. Precisión industrial: esquinas contenidas, sin pasar
  de `0.75rem` salvo casos puntuales.
- Separación con bordes `white/[0.06–0.10]`; el fondo oscuro es `#121110`.
- Sombra solo para separar superficies flotantes (menús, modales, paneles) y
  siempre **neutra** (negro con baja opacidad), nunca de color.

## 5. Componentes

### Botón flotante de WhatsApp (`WhatsAppFloatButton`)
- **Plano**: círculo verde sólido en móvil, píldora sólida en desktop.
- Sin glow, sin anillo pulsante, sin punto `animate-ping`; hover solo cambia el
  color de fondo (`#25D366` → `#20bd5a`).
- Panel con cabecera sólida (sin gradiente), chips de mensajes y textarea.

### Botones (`components/ui/button.tsx`)
- Superficie plana, borde sutil, acento solo en la acción primaria.
- Sin gradientes ni sombras de color.

### Tarjetas / paneles
- Fondo `panel`/`surface`, borde `white/[0.06]`, radio `--radius-lg`.
- Sombra neutra opcional; nunca sombra de acento.

## 6. Movimiento

- Transiciones de color/borde: 150–220 ms.
- Entradas de panel: fade + `scale 0.98→1` (~200–320 ms).
- Nada de animaciones en bucle (pulse/ping) salvo indicadores de carga reales.
- `prefers-reduced-motion: reduce` desactiva transformaciones y animaciones.

## 7. Implementación

- Inicio: las siluetas de granos (`grano.webp` / `grano2.webp`) se usan como
  textura de fondo repartida entre secciones, siempre invertidas a claro, con
  opacidad baja (5–8 %) y sin interferir con el contenido.

- Tailwind CSS v4 + tokens en `app/globals.css` (`@theme inline`).
- Utilidad `cn()` en `lib/utils.ts`.
- Nuevos componentes deben seguir los patrones existentes y, si aportan estilo
  propio, documentarse aquí.
- Textos de interfaz en español (es-CL).

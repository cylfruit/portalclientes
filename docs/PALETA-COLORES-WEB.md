# Paleta de colores web — C&L Fruit / CYL

Guía portable para **todos los sistemas web** del grupo. Mantener identidad CYL con UI elegante: fondo neutro cálido (60 %), superficies claras (30 %), amarillo corporativo como acento (10 %).

> Siempre Tailwind tiene prioridad sobre css vanilla
> Implementación de referencia: `app/global.css` en Portal Agrícola.
> El portal soporta **modo claro** y **modo oscuro** mediante `data-theme="dark"` en `<html>`.

---

## Modos de tema

| Aspecto               | Detalle                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------- |
| **Predeterminado**    | Modo oscuro (`data-theme="dark"` en `<html>`)                                                 |
| **Persistencia**      | `localStorage` clave `cyl-theme`: `'light'` = claro; cualquier otro valor o ausencia = oscuro |
| **Activación oscuro** | `document.documentElement.dataset.theme = 'dark'`                                             |
| **Activación claro**  | `document.documentElement.removeAttribute('data-theme')` → aplica `:root`                     |
| **Selector CSS**      | `:root` = modo claro · `[data-theme='dark']` = modo oscuro                                    |
| **Toggle UI**         | Botón sol/luna en el header (`components/layout/app-shell.tsx`)                               |

Los **5 colores oficiales de marca** (`--cyl-brand`, `--cyl-green-olive`, etc.) se mantienen en ambos modos. Lo que cambia son fondos, neutros, texto, acción, estados y sombras.

---

## Principio 60 · 30 · 10 (modo claro)

| %        | Rol                  | Colores                                           |
| -------- | -------------------- | ------------------------------------------------- |
| **60 %** | Fondo neutro cálido  | `#FBF8EF`                                         |
| **30 %** | Blancos y neutros    | `#FFFFFF`, `#F7F4EC`, `#E8E2D4`                   |
| **10 %** | Amarillo corporativo | `#F2C65C` — botones, enlaces activos, indicadores |

El amarillo **no** debe dominar el fondo; reservarlo para énfasis.

En **modo oscuro**, el equivalente visual usa fondos `#12110E`–`#252219` con acentos dorados más contenidos sobre superficies oscuras.

---

## 1. Paleta oficial CYL (5 colores — ambos modos)

Estos valores **no cambian** entre claro y oscuro:

| HEX       | Nombre      | Variable CSS        | Uso en UI                                                                     |
| --------- | ----------- | ------------------- | ----------------------------------------------------------------------------- |
| `#F2C65C` | Dorado      | `--cyl-brand`       | Marca, acentos, warning, degradé                                              |
| `#FFF8D5` | Crema       | `--cyl-brand-soft`  | Highlights, fondos suaves (claro); en oscuro se redefine a tono cálido oscuro |
| `#000000` | Negro       | `--cyl-black`       | Texto principal en claro; en oscuro se invierte a crema                       |
| `#68813B` | Verde oliva | `--cyl-green-olive` | Éxito, aprobado, estados positivos                                            |
| `#989400` | Verde lima  | `--cyl-green-lime`  | Enlaces, ghost, acento secundario agrícola                                    |

```css
--cyl-brand: #f2c65c;
--cyl-green-olive: #68813b;
--cyl-green-lime: #989400;
```

---

## 2. Fondos y superficies

| Uso                 | Modo claro (`:root`)       | Modo oscuro (`[data-theme='dark']`) | Variable                   |
| ------------------- | -------------------------- | ----------------------------------- | -------------------------- |
| Background          | `#FBF8EF`                  | `#12110E`                           | `--cyl-bg`                 |
| Surface             | `#FFFFFF`                  | `#1C1A17`                           | `--cyl-surface`            |
| Surface Alt         | `#F7F4EC`                  | `#252219`                           | `--cyl-surface-alt`        |
| Card                | `#FFFFFF`                  | `#1C1A17`                           | `--cyl-card`               |
| Border              | `#E8E2D4`                  | `#3A3630`                           | `--cyl-border`             |
| Header              | mezcla paper 92 % + blanco | mezcla paper 88 % + negro           | `--cyl-header-bg`          |
| Degradé corporativo | `#FFF8D5` → `#F2C65C`      | `#3D3520` → `#8A7128`               | `--cyl-gradient-corporate` |
| Brand soft          | `#FFF8D5`                  | `#3D3520`                           | `--cyl-brand-soft`         |
| Brand light         | `#FFF3C2`                  | `#4D4228`                           | `--cyl-brand-light`        |

---

## 3. Escala de neutros

| Nivel | Modo claro | Modo oscuro | Variable            |
| ----- | ---------- | ----------- | ------------------- |
| 900   | `#000000`  | `#F5F2EA`   | `--cyl-neutral-900` |
| 800   | `#2F2C27`  | `#E5E0D6`   | `--cyl-neutral-800` |
| 700   | `#4A4640`  | `#C9C3B8`   | `--cyl-neutral-700` |
| 600   | `#67625C`  | `#A8A195`   | `--cyl-neutral-600` |
| 500   | `#8A857F`  | `#8A8378`   | `--cyl-neutral-500` |
| 400   | `#B1ACA6`  | `#6B655C`   | `--cyl-neutral-400` |
| 300   | `#D6D1CA`  | `#4A4640`   | `--cyl-neutral-300` |
| 200   | `#E9E5DE`  | `#35322D`   | `--cyl-neutral-200` |
| 100   | `#F4F1EA`  | `#2A2723`   | `--cyl-neutral-100` |

En modo claro el texto principal usa `#000000`. En modo oscuro la escala se **invierte** para mantener contraste sobre fondos oscuros.

---

## 4. Colores de acción

### Primario (botones `btn-primary-cyl`)

| Estado      | Modo claro                   | Modo oscuro                  | Variable               |
| ----------- | ---------------------------- | ---------------------------- | ---------------------- |
| Default     | `#D4A937`                    | `#C9A030`                    | `--cyl-action`         |
| Hover       | `#C09428`                    | `#DBAE38`                    | `--cyl-action-hover`   |
| Pressed     | `#A97F16`                    | `#B89228`                    | `--cyl-action-pressed` |
| Texto botón | `#000000` (vía `--cyl-text`) | `#F5F2EA` (vía `--cyl-text`) | —                      |

No usar `#F2C65C` directo en botones — poco contraste. El texto del botón primario sigue `--cyl-text` (negro en claro, crema en oscuro).

### Secundario (`btn-secondary-cyl`)

Usa `--cyl-surface`, `--cyl-neutral-300` (borde), `--cyl-neutral-800` (texto) y `--cyl-surface-alt` (hover). Se adapta automáticamente al tema.

### Ghost (`btn-ghost-cyl`)

| Propiedad | Valor                          |
| --------- | ------------------------------ |
| Text      | `#989400` (`--cyl-green-lime`) |
| Hover bg  | mezcla lima + brand-soft       |

---

## 5. Estados

| Estado  | Color base | Fondo badge (claro) | Fondo badge (oscuro) | Texto badge (claro) | Texto badge (oscuro) |
| ------- | ---------- | ------------------- | -------------------- | ------------------- | -------------------- |
| Success | `#68813B`  | `#EEF2E8`           | `#2A3320`            | `#68813B`           | `#68813B`            |
| Warning | `#F2C65C`  | `#FFF3C2`           | `#3D3520`            | `#A97F16`           | `#E8C45A`            |
| Error   | `#D32F2F`  | `#FDEAEA`           | `#3D2020`            | `#C62828`           | `#F48A8A`            |
| Info    | `#1565C0`  | —                   | —                    | —                   | —                    |

Variables: `--cyl-success`, `--cyl-success-bg`, `--cyl-warning-bg`, `--cyl-warning-text`, `--cyl-error-bg`, `--cyl-error-text`.

Clases: `badge-success-cyl`, `badge-warning-cyl`, `badge-error-cyl`.

---

## 6. Texto

| Uso         | Modo claro | Modo oscuro                         | Variable                 |
| ----------- | ---------- | ----------------------------------- | ------------------------ |
| Principal   | `#000000`  | `#F5F2EA`                           | `--cyl-text`             |
| Secundario  | `#4A4640`  | `#C9C3B8` (vía `--cyl-neutral-700`) | `--cyl-text-secondary`   |
| Placeholder | `#8A857F`  | `#8A8378` (vía `--cyl-neutral-500`) | `--cyl-text-placeholder` |
| Disabled    | `#B1ACA6`  | `#6B655C` (vía `--cyl-neutral-400`) | `--cyl-text-disabled`    |

---

## 7. Inputs (`input-cyl`)

| Propiedad                  | Modo claro | Modo oscuro |
| -------------------------- | ---------- | ----------- |
| Background                 | `#FFFFFF`  | `#1C1A17`   |
| Border                     | `#D6D1CA`  | `#4A4640`   |
| Focus                      | `#D4A937`  | `#C9A030`   |
| Placeholder                | `#8A857F`  | `#8A8378`   |
| `color-scheme` (date/time) | `light`    | `dark`      |

---

## 8. Sombras

| Token             | Modo claro                     | Modo oscuro                    |
| ----------------- | ------------------------------ | ------------------------------ |
| `--cyl-shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)`   | `0 1px 2px rgba(0,0,0,0.35)`   |
| `--cyl-shadow`    | `0 8px 20px rgba(0,0,0,0.08)`  | `0 8px 20px rgba(0,0,0,0.40)`  |
| `--cyl-shadow-lg` | `0 20px 40px rgba(0,0,0,0.12)` | `0 20px 40px rgba(0,0,0,0.50)` |
| `--cyl-line`      | `rgba(0,0,0,0.10)`             | `rgba(255,255,255,0.08)`       |

---

## 9. Resultado visual

### Modo claro

```
┌──────────────────────────────┐
│ Background      #FBF8EF      │
│                              │
│  ┌────────────────────────┐  │
│  │ Card        #FFFFFF    │  │
│  │                        │  │
│  │ Título    #000000      │  │
│  │ Texto     #4A4640      │  │
│  │                        │  │
│  │ [ Botón #D4A937 ]      │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

### Modo oscuro

```
┌──────────────────────────────┐
│ Background      #12110E      │
│                              │
│  ┌────────────────────────┐  │
│  │ Card        #1C1A17    │  │
│  │                        │  │
│  │ Título    #F5F2EA      │  │
│  │ Texto     #C9C3B8      │  │
│  │                        │  │
│  │ [ Botón #C9A030 ]      │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

---

## 10. Bloque CSS (copiar a cada proyecto)

Ver `app/global.css` completo. Mínimo con soporte de ambos modos:

```css
:root {
  /* Marca (compartida) */
  --cyl-brand: #f2c65c;
  --cyl-brand-light: #fff3c2;
  --cyl-brand-soft: #fff8d5;
  --cyl-green-olive: #68813b;
  --cyl-green-lime: #989400;

  /* Modo claro */
  --cyl-bg: #fbf8ef;
  --cyl-surface: #ffffff;
  --cyl-surface-alt: #f7f4ec;
  --cyl-card: #ffffff;
  --cyl-border: #e8e2d4;
  --cyl-text: #000000;
  --cyl-action: #d4a937;
  --cyl-action-hover: #c09428;
  --cyl-action-pressed: #a97f16;
  --cyl-success-bg: #eef2e8;
  --cyl-warning-bg: #fff3c2;
  --cyl-warning-text: #a97f16;
  --cyl-error-bg: #fdeaea;
  --cyl-error-text: #c62828;
}

[data-theme='dark'] {
  color-scheme: dark;
  --cyl-text: #f5f2ea;
  --cyl-bg: #12110e;
  --cyl-surface: #1c1a17;
  --cyl-surface-alt: #252219;
  --cyl-card: #1c1a17;
  --cyl-border: #3a3630;
  --cyl-brand-soft: #3d3520;
  --cyl-brand-light: #4d4228;
  --cyl-action: #c9a030;
  --cyl-action-hover: #dbae38;
  --cyl-action-pressed: #b89228;
  --cyl-success-bg: #2a3320;
  --cyl-warning-bg: #3d3520;
  --cyl-warning-text: #e8c45a;
  --cyl-error-bg: #3d2020;
  --cyl-error-text: #f48a8a;
}

body {
  background: var(--cyl-bg);
  color: var(--cyl-text);
}

.card-cyl {
  background: var(--cyl-card);
  border: 1px solid var(--cyl-border);
}
.btn-primary-cyl {
  background: var(--cyl-action);
  color: var(--cyl-text);
}
.btn-primary-cyl:hover {
  background: var(--cyl-action-hover);
}
```

Inicialización en HTML (evita parpadeo; oscuro por defecto):

```html
<html lang="es" data-theme="dark">
  <head>
    <script>
      ;(function () {
        try {
          if (localStorage.getItem('cyl-theme') === 'light')
            document.documentElement.removeAttribute('data-theme')
        } catch (e) {}
      })()
    </script>
  </head>
</html>
```

---

## 11. Alias legacy

Para no romper clases existentes (`text-cyl-ink`, `bg-cyl-paper`, etc.):

| Alias                | Apunta a               |
| -------------------- | ---------------------- |
| `--cyl-paper`        | `--cyl-bg`             |
| `--cyl-paper-strong` | `--cyl-surface-alt`    |
| `--cyl-ink`          | `--cyl-text`           |
| `--cyl-muted`        | `--cyl-text-secondary` |
| `--cyl-gold`         | `--cyl-brand`          |
| `--cyl-gold-soft`    | `--cyl-brand-light`    |
| `--cyl-gold-dark`    | `--cyl-action`         |
| `--cyl-green`        | `--cyl-green-olive`    |
| `--cyl-border-light` | `--cyl-neutral-200`    |

Usar siempre variables CSS y clases Tailwind (`bg-cyl-paper`, `text-cyl-ink`, etc.) para que el cambio de tema sea automático. Evitar colores HEX fijos en componentes.

---

## 12. Checklist

### Modo claro

- [ ] Fondo página = `#FBF8EF`
- [ ] Tarjetas = `#FFFFFF`
- [ ] Botón primario = `#D4A937` + texto `#000000`
- [ ] Amarillo `#F2C65C` solo en acentos (~10 %)
- [ ] Texto principal = `#000000`
- [ ] Éxito / aprobado = `#68813B`
- [ ] Enlaces ghost = `#989400`

### Modo oscuro

- [ ] Fondo página = `#12110E`
- [ ] Tarjetas = `#1C1A17`
- [ ] Botón primario = `#C9A030` + texto `#F5F2EA`
- [ ] Bordes visibles sobre fondo oscuro (`#3A3630`)
- [ ] Badges con fondos oscuros semitransparentes
- [ ] Inputs `date`/`time` con `color-scheme: dark`
- [ ] Sin parpadeo al cargar (script + `data-theme="dark"` en `<html>`)

### Ambos modos

- [ ] Componentes usan variables CSS, no HEX hardcodeados
- [ ] Contraste legible en texto, bordes y botones
- [ ] Marca CYL reconocible (dorado + verde oliva/lima)

---

## Historial

| Versión | Cambio                                                                                                               |
| ------- | -------------------------------------------------------------------------------------------------------------------- |
| **2.2** | Documentación modo claro y oscuro; tablas comparativas; tema oscuro por defecto; alineación con `global.css` actual. |
| **2.1** | Paleta oficial 5 colores: dorado, crema, negro, oliva, lima.                                                         |
| **2.0** | Propuesta elegante: neutros cálidos, acción oscura, regla 60-30-10.                                                  |
| **1.x** | Iteraciones previas de fondo y complementarios.                                                                      |

---

_Documento vivo — replicar en cada sistema web del grupo._

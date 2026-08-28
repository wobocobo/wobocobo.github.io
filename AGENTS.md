# Wobocobo — Contexto del proyecto

## Qué es
Portfolio web de backend developer (Alejandro Ortega Hernández), alojado en GitHub Pages como `wobocobo.github.io`. Mezcla experiencia profesional con intereses personales (cine, música).

## Restricción principal
**GitHub Pages = sin herramientas de build, sin Node.js en runtime.** Solo HTML/JS/CSS puro. Librerías vía CDN están bien.

---

## Stack

| Recurso | Versión | CDN |
|---|---|---|
| Bootstrap | 5.3.2 | jsdelivr |
| AOS | 2.3.4 | unpkg |
| Google Fonts | Inter + Space Grotesk | fonts.googleapis.com |

Los 3 están en todas las páginas. El carrusel es **CSS scroll-snap puro** (sin Swiper): flechas + puntos manejados por `main.js`.

---

## Archivos y responsabilidades

### HTML
- `index.html` — página principal (7 bloques: header, hero, #about, #stack, #experience, #cases, #videos, footer)
- `cine.html` — valoraciones FilmAffinity
- `spoti.html` — playlists Spotify

### CSS
- `css/style.css` — hoja de estilos única (temas + layout + componentes). `cine.html`/`spoti.html` la comparten.

### JS
- `js/main.js` — TODO el JS del sitio (ver orden de carga y funciones abajo)
- `js/cine.js` — renderiza cards de películas (solo cine.html)

### Assets
- `assets/img/hero-bg.jpg` — fondo del hero
- `assets/img/about-photo.jpg` — foto de perfil real (la puso el usuario; origen `C:\Users\alexo\Downloads\imgYo.jpeg`)
- `assets/logos/` — logos de empresas y clientes
- `assets/docs/informe-accesibilidad-estrenarte.pdf`
- `data/ratings,json` — datos FilmAffinity (ver bugs)
- `scripts/scrape.js` + `workflows/update-ratings.yml` — workflow de scraping de valoraciones

---

## Orden de carga (todas las páginas)
```
Bootstrap CSS → AOS CSS → Google Fonts → style.css
(Bootstrap JS → AOS JS → main.js) al final del body
```

---

## Sistema de diseño

### Tipografía
- **Cuerpo:** Inter (`--font-body`)
- **Títulos/marca:** Space Grotesk (`--font-head`)

### Dark (default — `:root`)
| Variable | Valor | Uso |
|---|---|---|
| `--bg` | `#0a0f1e` | Fondo |
| `--bg-deep` | `#05080f` | Header/footer/bandas alt |
| `--surface` | `#0e1526` | Tarjetas |
| `--surface-2` | `#111a30` | Fondo secundario (chips, logos) |
| `--border` | `#1e2a47` | Bordes suaves |
| `--border-mid` | `#33456e` | Bordes medios |
| `--text` | `#f2f6fc` | Títulos |
| `--text-muted` | `#b9c6de` | Secundario legible |
| `--text-faint` | `#93a3c4` | Terciario (legible) |
| `--text-body` | `#dce5f2` | Párrafos |
| `--accent` | `#45c7ff` | Acento |
| `--accent-strong` | `#38bdf8` | Acento fuerte |
| `--accent-soft` | `#7fd9ff` | Hover |
| `--on-accent` | `#04283c` | Texto sobre acento |
| `--grad-1/--grad-2` | `#22d3ee`→`#38bdf8` | Gradientes |

### Light (`.light-theme`)
| Variable | Valor |
|---|---|
| `--bg` | `#ffffff` |
| `--text` | `#0d1526` |
| `--text-body` | `#1c2638` |
| `--accent` | `#0870b0` |
| `--on-accent` | `#ffffff` |

**Regla de contraste:** texto blanco/near-white sobre dark, negro/near-black sobre light. NUNCA grises ilegibles (los `--text-muted`/`--text-faint` se eligieron con ratio ≥ ~6:1). No hay variantes de color extra: solo dark + light.

---

## Funciones de js/main.js (todo junto, en orden)

1. `AOS.init()` — animaciones al hacer scroll
2. `theme()` — toggle dark/light con `localStorage` (`body.light-theme`)
3. `backToTop()` — botón `#backToTop` (scroll > 300px)
4. Menú hamburguesa `.menu-toggle` + dropdown `.dropdown` (solo móvil)
5. Timeline — `.timeline-progress` se rellena al scroll (trigger 70% viewport) y `.timeline-marker` se activa
6. `initCarousel(root)` — carrusel genérico; se aplica a todo `[data-carousel]`
   - Uso: `#casesCarousel` (marcado con `data-carousel`, track `[data-track]`, controles `[data-prev]/[data-next]/[data-dots]`). `#videos` es grid fijo, NO carrusel.

---

## Layout

### Boxed
- `.boxed` = max-width 1240px centrado con `padding-inline: clamp(1.25rem, 4.5vw, 4.5rem)`. **Ocupa ancho de pantalla con padding lateral.**
- `.section` con `padding-block` generoso.
- `.section--alt` = banda a lo ancho completo con `--bg-deep` (usada en #stack y #videos).

### Secciones de index.html

| Bloque | ID | Descripción |
|---|---|---|
| Header | — | Sticky, blur, brand con punto de acento, nav, dropdown, toggle tema |
| Hero | — | Full-bleed, `::before` con `color-mix` + hero-bg.jpg, pill + h1 + CTAs |
| Sobre mí | `#about` | **2 columnas**: texto + foto. Texto + imagen alineados y centrados (sin facts). Variante compacta (`#about` overrides: menos padding/air, foto `max-height:430px`) para verlo todo sin scroll. Foto: `assets/img/about-photo.jpg` |
| Stack | `#stack` | Chips con punto de categoría + leyenda |
| Experiencia | `#experience` | **Timeline con línea a la izquierda** y contenido expandido a la derecha (todos los breakpoints). Logos destacables (sin desaturar) |
| Casos | `#cases` | Carrusel **full-bleed** (`--cw: min(760px, 94vw)`), cards uniformes de altura igual (slide flex + `height:100%`): título pequeño-medio, descripción, stack en texto (`.case-tech`) y footer (logos / preview PDF / links) |
| Vídeos | `#videos` | Grid Bootstrap 2x2 (`row g-4` + `col-md-6`, `.ratio ratio-16x9`) |
| Footer | — | 3 columnas + copy, `--bg-deep`, uniforme en las 3 páginas |

---

## Convenciones de código

### Clases CSS
- **BEM-ish:** `.stack-chip__name`, `.case-card--featured`, `.carousel__track`, `.section--alt`
- **Modificadores** con `--`: `.case-card--featured`, `.timeline-item--current`, `.case-link--contact`, `.btn--primary/--ghost/--subtle/--sm`
- **Componente carrusel reutilizado**: `.carousel__slide`, `.carousel__arrow`, `.carousel__dot`
- **Preview PDF**: `.case-pdf-preview` (+ `__icon/__body/__open`) — caja compacta tipo documento, se abre en pestaña nueva
- **Dots de categoría:** `.dot-backend`, `.dot-frontend`, `.dot-cms`, `.dot-db`, `.dot-server`, `.dot-tools`
- Bootstrap utilities permitidas (`.row`, `.col-md-6`, `.text-center`, `.mt-2`, `.ratio-16x9`)

### Responsive
- **768px** — hamburguesa/nav móvil, about pasa a 1 columna, hero CTAs en columna
- **480px** — logos/gaps más compactos

### Breakpoints cableados en JS
- Menú dropdown solo se togglea con click si `window.innerWidth <= 768`.

### IDs usados
- Secciones: `#about`, `#stack`, `#experience`, `#cases`, `#videos`
- Funcionales: `#themeToggle`, `#backToTop`, `#casesCarousel`, `#videosCarousel`, `#movies`
- Botón CV: `#about .about-actions`

---

## Datos del usuario

- **Experiencia:** 2 trabajos
  - Difusión Comunicación (2021) — agencia digital
  - Z-Bombilla (2022–actualidad) — ecosistema interno, APIs, auditoría Amazon
- **CV fuente:** `C:\Users\alexo\Downloads\Experiencia.txt`
- **LinkedIn:** `https://linkedin.com/in/alejandro-ortega-hernandez` (en footer se usa la URL con "hernández"; mantener según se decida)
- **GitHub:** `https://github.com/wobocobo`
- **Email placeholder:** `placeholder@wobocobo.com`
- **FilmAffinity user_id:** `9048877`
- **Spotify user_id:** `11171869957`

---

## Decisiones de diseño tomadas (rediseño)

1. **Colores via variables + `color-mix()`:** acentos y overlays usan ` color-mix(in srgb, var(--accent) X%, transparent)` para adaptarse a cada tema. Sin opacidades hardcodeadas de un solo color.
2. **Hero overlay con `color-mix`:** `::before` usa `color-mix(in srgb, var(--bg) 72%, transparent)` sobre hero-bg.jpg.
3. **Layout boxed:** contenido a ancho completo con padding lateral variable (clamp). Bandas `--section--alt` a sangre completa mediante `section` sin wrapper de ancho fijo.
4. **Timeline a la izquierda:** la línea está siempre a la izquierda y la tarjeta ocupa todo el ancho restante hacia la derecha (expandida) en todos los breakpoints.
5. **Carrusel genérico:** CSS scroll-snap + `initCarousel()`. Arrastre con ratón/touchpad vía `pointer*` (clase `.dragging` + `.no-snap`), con **inercia y snap animado por rAF/easing**; en touch funciona el scroll nativo. Sin dependencias.
6. **Cards de casos:** solo texto (sin imagen), uniformes: título pequeño-medio (Space Grotesk, `clamp(0.95rem,1.6vw,1.15rem)`), descripción, stack en texto (`.case-tech`) y footer (logos / preview PDF / links). Sin chips `.case-stack`.
7. **Tipografía:** Inter + Space Grotesk traídas por Google Fonts.
8. **Header/footer uniformes** en las 3 páginas (misma estructura `.boxed`, brand-mark, toggle tema, #backToTop).
9. **Todo el JS en `main.js`** (sin scripts inline en HTML).

---

## Pendientes y bugs conocidos

1. **Cards de casos** — son solo texto (sin imagen). Si el usuario quiere imágenes reales uniformes, habrá que reintroducir una media coherente.
2. **Botón CV** — apunta a `#` con `title="Disponible próximamente"`. Falta el PDF real.
3. **`data/ratings,json`** — nombre de archivo usa coma en vez de punto (error del filesystem).
4. **LinkedIn URL** — en footer de las 3 páginas está `alejandro-ortega-hernández` (con tilde); AGENTS.md la tenía sin tilde. Unificar cuando se decida.
5. **Shipping logo (`assets/logos/shipping.png`)** — ocupa 1.38MB en disco vs 17KB en la versión pequeña; probablemente requiere optimización.
6. **Vídeos YouTube** — los IDs actuales (`I4qaG9yU7j0`, `wXzioxPtkW8`, `-NEuWT3fPSs`, `A-bc1A94dRA`) están en el grid 2x2; verificar que sigan siendo los deseados.
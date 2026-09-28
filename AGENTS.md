# Wobocobo — Contexto del proyecto

## Qué es
Portfolio web de backend developer (Alejandro Ortega Hernández), alojado en GitHub Pages con dominio propio **`wobocobo.com`** (el repo se sirve como `wobocobo.github.io` si se accede por la URL original). Mezcla experiencia profesional con intereses personales (cine, música).

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
- `js/cine.js` — renderiza cards de películas y listas (solo cine.html)

### Raíz
- `CNAME` — contiene `wobocobo.com` (dominio personalizado de GitHub Pages). Cambiar es editarlo + pushear. Todo el sitio usa **rutas relativas**, así que no hay que tocar HTML al cambiar de dominio.
- `favicon.ico` (blanco) y `faviconBlack.ico` (negro) — favicons en raíz. En `<head>` de las 3 páginas: un `<link rel="icon">` plano a `faviconBlack.ico` (para que Google/crawlers siempre encuentren favicon) + dos con `media="(prefers-color-scheme: ...)"`: `favicon.ico` para dark (blanco sobre fondo oscuro), `faviconBlack.ico` para light (negro sobre fondo claro). Pesan ~19KB/66KB, OK. Contienen solo un frame de 256px: si Google no muestra el favicon, regenerarlos con un frame de 48px (múltiplo requerido).

### Assets
- `assets/img/hero-bg.jpg` — fondo del hero
- `assets/img/about-photo.jpg` — foto de perfil real (la puso el usuario; origen `C:\Users\alexo\Downloads\imgYo.jpeg`)
- `assets/logos/` — logos de empresas y clientes. Incluye `filmmaffinity.png` (wordmark oficial, 300x75, **letras blancas sobre transparencia** → siempre sobre el chip de fondo azul `.page-intro__logo`, nunca sobre fondo claro). Bajado de `https://www.filmaffinity.com/images/logo4.png`; ojo, `Invoke-WebRequest` se come el challenge de Cloudflare, hay que usar `curl.exe` con UA de navegador (o `images.weserv.nl`). Y `spotify.svg` (glifo oficial 2024 "logo without text", saneado de `https://upload.wikimedia.org/wikipedia/commons/a/a1/2024_Spotify_logo_without_text_(black).svg` quitando los metadatos de Inkscape y poniéndolo en blanco con `fill-rule="evenodd"` para que los 3 arcos se perforen; ~2KB, escala por `viewBox`). Ojo: **no** usar `Spotify_logo_Square.svg` de Wikimedia (es un collage de miles de glifos, varios MB).
- `assets/docs/informe-accesibilidad-estrenarte.pdf`
- `data/ratings.json` — votos FilmAffinity (formato: `[{id, title, year, rating, poster, url, ratedAt}]`, ordenados por fecha de voto desc). Lo genera el exportador de cine.
- `data/lists.json` — listas públicas de FilmAffinity (formato: `[{id, name, count, description?, url, posters[]}]`). Estático, se extrae a mano de `userlists.php` (no hay paginación, 6 listas).
  - **Los `poster`/`posters` se guardan como URLs crudas de `pics.filmaffinity.com`** (no reescribir el JSON). El hotlink directo devuelve **403** (Cloudflare bloquea cualquier request que no venga de filmmaffinity.com, incluso con UA y Referer de navegador), así que `js/cine.js` los enruta en tiempo de render por el proxy **`https://images.weserv.nl/?url=<host+path>&w=<width>&q=80&output=jpg`** (`posterUrl()` / `posterImg()`, anchos 400 para películas y 300 para listas). Si el proxy falla, un listener delegado en fase capture reintenta con la URL original (`data-fallback`). `posterUrl()` deja pasar sin proxificar cualquier src que no sea de `pics.filmaffinity.com`, por lo que si algún día se descargan pósters a `assets/img/poster/` basta con poner rutas relativas en el JSON.
- `scripts/cine-export/cine-export.js` — código fuente del marcador exportador de votos de FilmAffinity
- **Contacto:** sección `#contact` de `index.html` envía vía **FormSubmit** (`https://formsubmit.co/ajax/hola@wobocobo.com`, AJAX desde `main.js`). Antispam: honeypot `_honey` + captcha automático de FormSubmit + `_blacklist` de patrones de inyección; saneo/longitudes/filtro de código en cliente (`main.js`). El email llega a `hola@wobocobo.com` y Cloudflare Email Routing lo reenvía al correo personal. (Se descartó Worker/Resend/Email Service.)
- `exportar-cine.html` — página de instrucciones con el bookmarklet arrastrable para generar `data/ratings.json` (se puede borrar tras el uso)

> **Por qué exportador y no scraping:** FilmAffinity está detrás de Cloudflare managed challenge (`captchaType: CLOUDFARE_INVISIBLE`). Las peticiones que no sean de navegador (axios/curl/GitHub Actions) reciben `"Just a moment..."` y nunca el HTML real. La única vía fiable es extraer desde el navegador del usuario (que ya pasó el challenge): abrir el perfil en **vista lista** (`chv=list`, que sí incluye el año en `.mc-year`; la vista grid no lo tiene), pulsar el marcador y responder al cuadro de diálogo: **solo primera página** (~50 votos recientes, de sobra para las 12 mostradas) o **todas las páginas** (~622 votos, 13 páginas) y guardar el JSON descargado en `data/ratings.json`. Selectores reales: `.fa-content-card` (grupo por fecha de voto) → `.row.mb-4` → `.movie-card[data-movie-id]`, `.mc-title a`, `.mc-year`, `.fa-user-rat-box`, `.poster-col img[data-srcset]`.

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
- **Modificadores** con `--`: `.case-card--featured`, `.timeline-item--current`, `.case-link--contact`, `.page-intro--fa/--sp`, `.btn--primary/--ghost/--subtle/--sm/--shine` (`.btn--shine` = barrido especular `::before` + brillo inferior `::after` + flecha que se desliza; solo hover, se usa en el CTA de las intros de `cine.html` y `spoti.html`)
- **Intro compartida** (cine + spoti): `.page-intro`, `__brand`, `__logo`, `__ring`/`__ring-value` (solo FilmAffinity), `__eq` (solo Spotify: 4 `<span>` vacios animados por CSS), `__lead`, `__actions`
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
- `cine.html` (los carga `js/cine.js`): bloque intro `#profile` (`.page-intro .page-intro--fa`, va PRIMERO en la página) con `[data-cine-stat]` (`avg`/`rated`/`lists`, inyectados desde los JSON por `renderIntro()`), `[data-cine-ring]` + `.circle-fill` (anillo de progreso; `stroke-dashoffset = 100 - notaMedia%`, circunferencia del path r=15.9155 ≈ 100) y un único `.btn--primary` al grid de FilmAffinity. Luego `#movies` (grid, `slice(0,12)`) y `#lists` (grid **fijo de 3 columnas** — las 6 listas enteras, 3+3, no `auto-fill`; colapsa a 2 col ≤900px y 1 col ≤560px).
- `spoti.html` (NO carga JS propio): bloque intro `#profile` (`.page-intro .page-intro--sp`, PRIMERO también) con el glifo `assets/logos/spotify.svg` sobre chip verde + un ecualizador CSS de 4 barras (`.page-intro__eq`, `@keyframes eq-bounce`, alturas y `animation-delay` por `:nth-child`, gradiente `--grad-1/--grad-2`) y un único `.btn-spotify.btn--shine` al perfil de Spotify. Debajo, `<h3>Playlists</h3>` + `<div class="row g-4">` con los 6 `<iframe src="https://open.spotify.com/embed/playlist/...">`. **Ya no existe** el `<section class="spotify-cta">` de abajo ni su regla `.spotify-cta p` (el CTA vive solo en la intro).

---

## Datos del usuario

- **Experiencia:** 2 trabajos
  - Difusión Comunicación (2021) — agencia digital
  - Z-Bombilla (2022–actualidad) — ecosistema interno, APIs, auditoría Amazon
- **CV fuente:** `C:\Users\alexo\Downloads\Experiencia.txt`
- **LinkedIn:** `https://linkedin.com/in/alejandro-ortega-hernandez` (en footer se usa la URL con "hernández"; mantener según se decida)
- **GitHub:** `https://github.com/wobocobo`
- **Email contacto:** `hola@wobocobo.com` (reenvío por Cloudflare Email Routing a correo personal)
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
9. **Todo el JS en `main.js`** (sin scripts inline en HTML). Excepción: `js/cine.js`, que es数据和 render propio de `cine.html`.
10. **Intro compartida de `cine.html` y `spoti.html` (`.page-intro`):** primer bloque de ambas páginas, card centrada con la misma marca + visual animado a la derecha del logo, `<h2>` + lead de 2 frases con `<br>` (que se oculta ≤900px) y un único botón `.btn--shine`. Se parametriza con modificadores: `--fa` (chip azul + wordmark FilmAffinity + anillo de progreso con la geometría exacta de su elemento, `viewBox="0 0 36 36"`, `r=15.9155` → circunferencia ≈ 100, y la nota media dentro; los números se calculan en `renderIntro()` desde los JSON, así que nada queda hardcodeado) y `--sp` (chip verde + glifo `spotify.svg` + ecualizador de 4 barras, que sustituye al anillo porque no hay nota media). La geometría de cine (`.page-intro__logo` 134.4x45.2, brand 66px de alto) debe conservarse al tocar estas reglas.

---

## Pendientes y bugs conocidos

1. **Cards de casos** — son solo texto (sin imagen). Si el usuario quiere imágenes reales uniformes, habrá que reintroducir una media coherente.
2. **Botón CV** — apunta a `#` con `title="Disponible próximamente"`. Falta el PDF real.
3. **LinkedIn URL** — en footer de las 3 páginas está `alejandro-ortega-hernández` (con tilde); AGENTS.md la tenía sin tilde. Unificar cuando se decida.
4. **Shipping logo (`assets/logos/shipping.png`)** — ocupa 1.38MB en disco vs 17KB en la versión pequeña; probablemente requiere optimización.
5. **Vídeos YouTube** — los IDs actuales (`I4qaG9yU7j0`, `wXzioxPtkW8`, `-NEuWT3fPSs`, `A-bc1A94dRA`) están en el grid 2x2; verificar que sigan siendo los deseados.
6. **`data/ratings.json`** — contiene solo la página 1 (50 votos del export). Ejecutar el marcador de `exportar-cine.html` en las 9 páginas para completar los 622. ~~Los pósters apuntan a `pics.filmaffinity.com` (hotlink)~~ **resuelto**: el hotlink da 403, ahora se sirven vía `images.weserv.nl` (ver nota en `data/lists.json`). Alternativa si el proxy algún día falla: descargarlos a `assets/img/poster/` y poner rutas relativas en el JSON (el código ya las acepta).

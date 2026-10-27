/* ============================================================
   Cine (cine.html)
   Todo sale de data/ratings.json (lo genera el marcador de
   exportar-cine.html): mosaico de pósters de la cabecera y el
   catálogo completo con buscador y filtros.

   Cada película es una entrada de cine que se gira: delante el
   póster con mi nota y detrás los datos (dirección, país, reparto,
   mi nota frente a la de FilmAffinity). Gira al pasar el ratón, con
   el foco de teclado y, en pantallas táctiles, al tocarla.

   Los pósters se piden por images.weserv.nl porque el hotlink a
   pics.filmaffinity.com da 403; si el proxy falla, se reintenta con
   la URL original (data-fallback).
   ============================================================ */
(function cine() {
  const catalogEl = document.getElementById('catalog');
  if (!catalogEl) return;

  const IMAGE_PROXY = 'https://images.weserv.nl/?url=';
  const PAGE = 48;
  const MOSAIC_TILES = 28;

  const form = document.querySelector('[data-filters]');
  const countEl = document.querySelector('[data-result-count]');
  const emptyEl = document.querySelector('[data-empty]');
  const pagerEl = document.querySelector('[data-pager]');
  const pagerMiniEl = document.querySelector('[data-pager-mini]');
  const catalogTitle = document.getElementById('allTitle');
  const mosaic = document.querySelector('[data-mosaic]');

  const dateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const decimal = (n) => n.toFixed(1).replace('.', ',');

  function posterUrl(src, width) {
    if (!src) return '';
    if (!/^https?:\/\//i.test(src)) return src;
    const bare = src.replace(/^https?:\/\//i, '');
    if (!/^pics\.filmaffinity\.com\//i.test(bare)) return src;
    return IMAGE_PROXY + bare + '&w=' + width + '&q=80&output=jpg';
  }

  document.addEventListener('error', e => {
    const img = e.target;
    if (!img || img.tagName !== 'IMG' || !img.dataset.fallback || img.dataset.fallbackUsed) return;
    img.dataset.fallbackUsed = '1';
    img.src = img.dataset.fallback;
  }, true);

  /* Elemento con clase y texto, para montar las entradas sin innerHTML */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function posterImg(movie, width) {
    const img = el('img');
    img.src = posterUrl(movie.poster, width);
    img.dataset.fallback = movie.poster;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }

  /* Tramo de color de la nota (rojo, ámbar, verde, dorado) */
  function tier(rating) {
    if (rating >= 9) return 'top';
    if (rating >= 7) return 'good';
    if (rating >= 5) return 'mid';
    return 'low';
  }

  function formatDate(iso) {
    const d = new Date(iso + 'T12:00:00');
    return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d).replace('.', '');
  }

  /* ---------- entrada ---------- */

  function ticket(movie) {
    const title = movie.title + (movie.year ? ` (${movie.year})` : '');
    const card = el('article', 'ticket');

    const inner = el('div', 'ticket__inner');

    /* Delante: póster con mi nota; el botón cubre la cara y la gira */
    const front = el('div', 'ticket__face ticket__front');
    front.appendChild(posterImg(movie, 320));
    const badge = el('span', `ticket__rating ticket__rating--${tier(movie.rating)}`, String(movie.rating));
    badge.setAttribute('aria-hidden', 'true');
    front.appendChild(badge);
    const flip = el('button', 'ticket__flip');
    flip.type = 'button';
    flip.setAttribute('aria-label', `Ver los datos de ${title}`);
    flip.addEventListener('click', () => card.classList.add('is-flipped'));
    front.appendChild(flip);

    /* Detrás: la entrada, con sus datos */
    const back = el('div', 'ticket__face ticket__back');
    back.addEventListener('click', e => {
      if (!e.target.closest('a')) card.classList.remove('is-flipped');
    });
    back.appendChild(el('span', 'ticket__kicker', 'Entrada · Cine'));
    back.appendChild(el('h3', 'ticket__title', movie.title));
    const meta = [movie.year, movie.country].filter(Boolean).join(' · ');
    if (meta) back.appendChild(el('p', 'ticket__meta', meta));
    if (movie.directors && movie.directors.length) {
      const p = el('p', 'ticket__line');
      p.append(el('b', '', 'Dirección '), movie.directors.join(', '));
      back.appendChild(p);
    }
    if (movie.cast && movie.cast.length) {
      const p = el('p', 'ticket__line');
      p.append(el('b', '', 'Reparto '), movie.cast.join(', '));
      back.appendChild(p);
    }

    const scores = el('div', 'ticket__scores');
    const mine = el('span', 'ticket__score');
    mine.append(el('small', '', 'Mi nota'), el('strong', `ticket__score--${tier(movie.rating)}`, String(movie.rating)));
    scores.appendChild(mine);
    if (movie.avg != null) {
      const fa = el('span', 'ticket__score');
      fa.append(el('small', '', 'FilmAffinity'), el('strong', '', decimal(movie.avg)));
      scores.appendChild(fa);
    }
    back.appendChild(scores);

    const stub = el('div', 'ticket__stub');
    const when = formatDate(movie.ratedAt);
    if (when) stub.appendChild(el('span', '', when));
    stub.appendChild(el('span', 'ticket__serial', 'Nº ' + movie.id));
    const link = el('a', 'ticket__link', 'FilmAffinity ↗');
    link.href = `https://www.filmaffinity.com/es/film${encodeURIComponent(movie.id)}.html`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `${title} en FilmAffinity`);
    stub.appendChild(link);
    back.appendChild(stub);

    inner.append(front, back);
    card.appendChild(inner);

    /* Debajo, fuera del giro: título y año, siempre visibles */
    const caption = el('div', 'ticket__caption');
    caption.append(el('p', 'ticket__name', movie.title), el('p', 'ticket__year', movie.year ? String(movie.year) : ''));
    card.appendChild(caption);
    return card;
  }

  /* Tocar fuera de una entrada girada la vuelve a poner de frente */
  document.addEventListener('click', e => {
    document.querySelectorAll('.ticket.is-flipped').forEach(card => {
      if (!card.contains(e.target)) card.classList.remove('is-flipped');
    });
  });

  /* ---------- cabecera ---------- */

  function renderHero(movies) {
    if (!mosaic) return;
    const pool = movies.filter(m => m.poster).slice(0, MOSAIC_TILES);
    for (let i = 0; i < MOSAIC_TILES && pool.length; i++) {
      const img = posterImg(pool[i % pool.length], 200);
      img.addEventListener('load', () => img.classList.add('is-loaded'));
      mosaic.appendChild(img);
    }
  }

  /* ---------- catálogo ---------- */

  const normalize = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  let movies = [];
  let results = [];
  let page = 1;
  let size = 0;

  function fillSelect(name, values) {
    const select = form.elements[name];
    values.forEach(([value, label]) => {
      const opt = el('option', '', label);
      opt.value = value;
      select.appendChild(opt);
    });
  }

  function setupFilters() {
    /* Géneros que hay en los datos, de más a menos películas (una puede tener varios) */
    const byGenre = new Map();
    movies.forEach(m => (m.genres || []).forEach(g => byGenre.set(g, (byGenre.get(g) || 0) + 1)));
    if (byGenre.size) {
      fillSelect('genre', [...byGenre].sort((a, b) => b[1] - a[1]).map(([g, n]) => [g, `${g} (${n})`]));
      form.querySelector('[data-genre-field]').hidden = false;
    }

    /* Cambiar cuántas por página no vuelve a la primera: se queda donde estabas */
    form.addEventListener('input', e => (e.target.name === 'per' ? render() : apply()));
    form.addEventListener('submit', e => e.preventDefault());
    form.hidden = false;
  }

  const SORTS = {
    recent: () => 0,
    best: (a, b) => b.rating - a.rating || (b.avg || 0) - (a.avg || 0),
    worst: (a, b) => a.rating - b.rating || (a.avg || 0) - (b.avg || 0),
    year: (a, b) => (b.year || 0) - (a.year || 0),
    old: (a, b) => (a.year || 9999) - (b.year || 9999),
    title: (a, b) => a.title.localeCompare(b.title, 'es')
  };

  function apply() {
    const f = form.elements;
    const q = normalize(f.q.value.trim());
    const [rMin, rMax] = f.rating.value ? f.rating.value.split('-').map(Number) : [1, 10];
    const genre = f.genre.value;

    results = movies.filter(m =>
      m.rating >= rMin && m.rating <= rMax &&
      (!genre || (m.genres || []).includes(genre)) &&
      (!q || m._search.includes(q))
    );
    /* sort es estable: con «recent» (0) se queda el orden del JSON */
    results.sort(SORTS[f.sort.value] || SORTS.recent);

    const total = movies.length;
    const found = results.length === total ? `${total} películas` : `${results.length} de ${total} películas`;
    countEl.textContent = `${found} · pasa por encima o toca una para darle la vuelta`;
    emptyEl.hidden = results.length > 0;

    page = 1;
    size = 0;
    render();
  }

  /* ---------- paginado ---------- */

  /* Las que se piden por página, redondeadas a filas completas (48 con 9
     columnas son 54) para que la última fila no quede coja */
  function pageSize() {
    const cols = getComputedStyle(catalogEl).gridTemplateColumns.split(' ').length || 1;
    const per = Number(form && form.elements.per.value) || PAGE;
    return cols * Math.ceil(per / cols);
  }

  /* Pinta la página actual. Si cambia el tamaño de página (por el selector o
     porque cambian las columnas), sigue en la que contiene la primera
     película que se estaba viendo. */
  function render({ scroll = false } = {}) {
    const newSize = pageSize();
    if (size && newSize !== size) page = Math.floor(((page - 1) * size) / newSize) + 1;
    size = newSize;
    const pages = Math.max(1, Math.ceil(results.length / size));
    page = Math.min(Math.max(1, page), pages);

    const frag = document.createDocumentFragment();
    results.slice((page - 1) * size, page * size).forEach(m => frag.appendChild(ticket(m)));
    catalogEl.replaceChildren(frag);
    renderPager(pages);

    if (scroll) {
      /* Al principio del catálogo, bajo el navbar; el foco va al título para
         que el teclado siga desde ahí (los botones del paginado se rehacen) */
      const top = document.getElementById('todas').getBoundingClientRect().top + window.scrollY - 64;
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
      catalogTitle.focus({ preventScroll: true });
    }
  }

  function goToPage(n) {
    page = n;
    render({ scroll: true });
  }

  /* 1 … 4 5 6 … 14: siempre la primera y la última, la actual y sus vecinas;
     cerca de los extremos se completan para no dejar un «…» de un solo hueco */
  function pageList(current, total) {
    const keep = new Set([1, total, current - 1, current, current + 1]);
    if (current <= 4) [2, 3, 4, 5].forEach(n => keep.add(n));
    if (current >= total - 3) [total - 1, total - 2, total - 3, total - 4].forEach(n => keep.add(n));
    const nums = [...keep].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
    const out = [];
    nums.forEach((n, i) => {
      if (i && n - nums[i - 1] > 1) out.push('…');
      out.push(n);
    });
    return out;
  }

  const ARROW_LEFT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  const ARROW_RIGHT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

  function stepButton(className, label, icon, text, target, disabled) {
    const btn = el('button', className);
    btn.type = 'button';
    btn.setAttribute('aria-label', label);
    btn.innerHTML = icon;
    if (text) btn.insertAdjacentElement(icon === ARROW_LEFT ? 'beforeend' : 'afterbegin', el('span', '', text));
    btn.disabled = disabled;
    btn.addEventListener('click', () => goToPage(target));
    return btn;
  }

  function renderPager(pages) {
    const show = pages > 1;
    pagerEl.hidden = !show;
    pagerMiniEl.hidden = !show;
    pagerEl.replaceChildren();
    pagerMiniEl.replaceChildren();
    if (!show) return;

    /* Abajo: anterior, números y siguiente */
    pagerEl.appendChild(stepButton('cine-pager__step', 'Página anterior', ARROW_LEFT, 'Anterior', page - 1, page === 1));
    pageList(page, pages).forEach(n => {
      if (n === '…') {
        const gap = el('span', 'cine-pager__gap', '…');
        gap.setAttribute('aria-hidden', 'true');
        pagerEl.appendChild(gap);
        return;
      }
      const btn = el('button', 'cine-pager__page', String(n));
      btn.type = 'button';
      btn.setAttribute('aria-label', `Página ${n}`);
      if (n === page) btn.setAttribute('aria-current', 'page');
      else btn.addEventListener('click', () => goToPage(n));
      pagerEl.appendChild(btn);
    });
    pagerEl.appendChild(stepButton('cine-pager__step', 'Página siguiente', ARROW_RIGHT, 'Siguiente', page + 1, page === pages));

    /* Arriba, junto al contador: «Página 2 de 14» con flechas */
    const label = el('span', 'cine-pager-mini__label');
    label.append('Página ', el('b', '', String(page)), ` de ${pages}`);
    pagerMiniEl.append(
      stepButton('cine-pager-mini__step', 'Página anterior', ARROW_LEFT, '', page - 1, page === 1),
      label,
      stepButton('cine-pager-mini__step', 'Página siguiente', ARROW_RIGHT, '', page + 1, page === pages)
    );
  }

  /* Si cambian las columnas al redimensionar, se recalcula el tamaño de página */
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (results.length && pageSize() !== size) render();
    }, 150);
  });

  /* ---------- carga ---------- */

  fetch('data/ratings.json')
    .then(res => res.json())
    .then(data => {
      movies = (Array.isArray(data) ? data : []).filter(m => m && m.title && m.rating);
      if (!movies.length) {
        catalogEl.appendChild(el('p', 'pl-empty', 'Todavía no hay valoraciones exportadas.'));
        return;
      }
      movies.forEach(m => {
        m._search = normalize([m.title, ...(m.directors || []), ...(m.cast || [])].join(' '));
      });

      renderHero(movies);
      if (form) {
        setupFilters();
        apply();
      }
    })
    .catch(err => {
      console.error('Error cargando películas:', err);
      catalogEl.appendChild(el('p', 'pl-empty', 'No se ha podido cargar data/ratings.json.'));
    });

  /* ---------- listas ---------- */

  const listsEl = document.getElementById('lists');
  if (!listsEl) return;

  fetch('data/lists.json')
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data) || !data.length) {
        listsEl.appendChild(el('p', 'pl-empty', 'Todavía no hay listas exportadas.'));
        return;
      }
      data.forEach(list => {
        const card = el('a', 'list-card');
        card.href = list.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.setAttribute('aria-label', list.name + ' en FilmAffinity');

        if (list.posters && list.posters.length) {
          const posters = el('div', 'list-card__posters');
          list.posters.forEach(src => posters.appendChild(posterImg({ poster: src }, 300)));
          card.appendChild(posters);
        }
        const info = el('div', 'list-card__info');
        info.append(el('h3', '', list.name), el('span', 'count', `${list.count} títulos`));
        if (list.description) info.appendChild(el('p', 'desc', list.description));
        card.appendChild(info);
        listsEl.appendChild(card);
      });
    })
    .catch(err => {
      console.error('Error cargando listas:', err);
      listsEl.appendChild(el('p', 'pl-empty', 'No se ha podido cargar data/lists.json.'));
    });
})();

// AOS
AOS.init({
  once: true,
  duration: 800,
  easing: 'ease-out-cubic'
});

/* ============================================================
   Tema oscuro / claro
   Aplica a las 3 páginas. Estado guardado en localStorage.
   ============================================================ */
(function theme() {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  const applyTheme = (light) => {
    document.body.classList.toggle('light-theme', light);
    toggle.setAttribute('aria-label', light ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro');
  };

  applyTheme(localStorage.getItem('theme') === 'light');

  toggle.addEventListener('click', () => {
    const light = !document.body.classList.contains('light-theme');
    localStorage.setItem('theme', light ? 'light' : 'dark');
    applyTheme(light);
  });
})();

/* ============================================================
   Reloj en vivo (hora de España, Europe/Madrid)
   ============================================================ */
(function clock() {
  const el = document.getElementById('headerTime');
  if (!el) return;

  const fmt = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const tick = () => {
    el.textContent = fmt.format(new Date());
  };

  tick();
  setInterval(tick, 1000);
})();

/* ============================================================
   Back to top
   ============================================================ */
(function backToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  const update = () => {
    btn.style.display = window.scrollY > 300 ? 'block' : 'none';
  };

  window.addEventListener('scroll', update, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  update();
})();

/* ============================================================
   Header compacto: arriba del todo va limpio; en cuanto se baja
   un poco gana fondo difuminado y menos altura (.is-scrolled).
   ============================================================ */
(function headerScroll() {
  const header = document.querySelector('.main-header');
  if (!header) return;

  const update = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
})();

/* ============================================================
   Scroll-spy: resalta en la píldora el enlace de la sección que
   cruza la mitad de la pantalla. Solo actúa con enlaces #hash,
   así que en cine/spoti no hace nada.
   ============================================================ */
(function navSpy() {
  const links = [...document.querySelectorAll('.nav__link[href^="#"]')];
  if (!links.length || !('IntersectionObserver' in window)) return;

  const byId = new Map(links.map((link) => [link.getAttribute('href').slice(1), link]));
  const sections = [...document.querySelectorAll('section[id]')];

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const current = byId.get(entry.target.id);
        links.forEach((link) => link.classList.toggle('is-active', link === current));
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );

  sections.forEach((section) => io.observe(section));
})();

/* ============================================================
   Menú móvil a pantalla completa + dropdown Curiosidades
   ============================================================ */
const toggleBtn = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
const dropdown = document.querySelector('.dropdown');
const dropdownToggle = document.querySelector('.dropdown-toggle');

const isMobile = () => window.innerWidth <= 900;

const closeDropdown = () => {
  if (!dropdown) return;
  dropdown.classList.remove('open');
  if (dropdownToggle) dropdownToggle.setAttribute('aria-expanded', 'false');
};

const closeMenu = () => {
  if (!nav) return;
  nav.classList.remove('open');
  document.documentElement.classList.remove('menu-open');
  closeDropdown();
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.setAttribute('aria-label', 'Abrir menú');
  }
};

if (toggleBtn && nav) {
  toggleBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    document.documentElement.classList.toggle('menu-open', open);
    toggleBtn.setAttribute('aria-expanded', String(open));
    toggleBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });

  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeMenu();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.main-header')) closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  window.addEventListener('resize', () => {
    if (!isMobile()) closeMenu();
  });
}

/* En escritorio se abre con hover/foco (CSS) y también con clic, para
   táctiles grandes; en el menú móvil sus enlaces ya están a la vista. */
if (dropdown && dropdownToggle) {
  dropdownToggle.addEventListener('click', () => {
    if (isMobile()) return;
    const open = dropdown.classList.toggle('open');
    dropdownToggle.setAttribute('aria-expanded', String(open));
    if (!open) dropdownToggle.blur();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) closeDropdown();
  });
}

/* ============================================================
   Timeline: línea de progreso (a la izquierda) y nodos activos al
   hacer scroll; «Ver más» despliega las viñetas de cada puesto.
   ============================================================ */
const timeline = document.querySelector('.timeline');

if (timeline) {
  const progress = timeline.querySelector('.timeline-progress');
  const markers = [...timeline.querySelectorAll('.timeline-marker')];

  const updateTimeline = () => {
    const rect = timeline.getBoundingClientRect();
    const trigger = window.innerHeight * 0.7;
    const passed = Math.min(Math.max(trigger - rect.top, 0), rect.height);
    progress.style.height = passed + 'px';

    markers.forEach((marker) => {
      const r = marker.getBoundingClientRect();
      const markerY = r.top - rect.top + r.height / 2;
      marker.classList.toggle('active', markerY <= passed);
    });
  };

  window.addEventListener('scroll', updateTimeline, { passive: true });
  window.addEventListener('resize', updateTimeline);
  /* Al plegar o desplegar un puesto, el alto de la timeline cambia en cada
     fotograma de la transición: la línea lo sigue en vez de esperar al final */
  if ('ResizeObserver' in window) new ResizeObserver(updateTimeline).observe(timeline);
  updateTimeline();

  /* «Ver más»: anima max-height desde el trozo que asoma hasta la altura real
     y, al terminar, la deja en none para que aguante cambios de ancho. Al
     plegar se parte de la altura en px (desde none no hay transición). */
  timeline.querySelectorAll('.timeline-toggle').forEach((btn) => {
    const item = btn.closest('.timeline-item');
    const more = item.querySelector('.timeline-more');
    const label = btn.querySelector('span');

    btn.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      more.style.maxHeight = more.scrollHeight + 'px';
      if (!open) {
        void more.offsetHeight;
        more.style.maxHeight = '';
      }
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Ver menos' : 'Ver más';
    });

    more.addEventListener('transitionend', (e) => {
      if (e.propertyName !== 'max-height') return;
      if (item.classList.contains('is-open')) more.style.maxHeight = 'none';
      updateTimeline();
    });
  });
}

/* ============================================================
   Carrusel genérico (hoy, los casos de #cases)
   Uso: <div data-carousel> con track [data-track], flechas
   [data-prev]/[data-next] y puntos [data-dots].
   Con [data-wrap] es una RUEDA: no hay principio ni final y no
   se clona nada, solo se rota el orden de los mismos slides en
   el DOM (ver rotateForward/rotateBack).
   ============================================================ */
function initCarousel(root) {
  const track = root.querySelector('[data-track]');
  if (!track) return;

  const slides = [...track.children];
  const dotsWrap = root.querySelector('[data-dots]');
  const prevBtn = root.querySelector('[data-prev]');
  const nextBtn = root.querySelector('[data-next]');
  if (!dotsWrap || !prevBtn || !nextBtn) return;

  const total = slides.length;
  const wrap = root.hasAttribute('data-wrap') && total > 1;

  /* Con slides que ocupan el ancho del track (o con un sangrado simétrico de
     `padding-inline`), el slide de la posición p queda centrado justo con
     scrollLeft = p * step(), y el recorrido va de 0 a (total - 1) * step(). */
  const step = () =>
    slides[0].offsetWidth + parseFloat(getComputedStyle(track).columnGap || 0);
  const maxScroll = () => track.scrollWidth - track.clientWidth;

  /* Ruedas: `order` es el índice lógico del slide que ocupa la posición 0 del
     DOM. Rotar reordena los MISMOS nodos (nada de clones) y compensa el
     scrollLeft justo lo que se han desplazado, así que el dibujo en pantalla no
     cambia en absoluto: el usuario no ve ningún salto, solo que la fila de
     cards parece no tener fin. */
  let order = 0;
  const domOf = (logical) => ((logical - order) % total + total) % total;
  const currentIndex = () => (Math.round(track.scrollLeft / step()) + order) % total;

  /* Ojo: el scroll se guarda ANTES de tocar el DOM y se escribe como valor
     absoluto. Si se leyera después, el reflow ya habría re-snapeado el track y
     la compensación partiría de un valor movido. */
  const rotateForward = () => {
    const from = track.scrollLeft;
    track.appendChild(track.firstElementChild);
    order = (order + 1) % total;
    track.scrollLeft = from - step();
  };
  const rotateBack = () => {
    const from = track.scrollLeft;
    track.insertBefore(track.lastElementChild, track.firstElementChild);
    order = (order - 1 + total) % total;
    track.scrollLeft = from + step();
  };

  let frameRaf = null;
  const stopFrame = () => {
    if (frameRaf) {
      cancelAnimationFrame(frameRaf);
      frameRaf = null;
    }
  };
  const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

/* Lleva el slide lógico pedido al centro. En modo rueda da la vuelta entre la
     última y la primera, sin huecos ni saltos: siempre se desliza. */
  const goTo = (logical) => {
    const target = wrap
      ? (((logical % total) + total) % total)
      : Math.max(0, Math.min(total - 1, logical));
    if (target === currentIndex() && Math.abs(track.scrollLeft % step()) < 1) {
      track.classList.remove('no-snap');
      return;
    }

    const here = Math.round(track.scrollLeft / step());
    let pos = target;

    if (wrap) {
      /* Se prueban todas las rotaciones posibles (hacia delante y hacia atrás)
         y se elige la que deja el slide pedido en una posición INTERIOR —con
         card a ambos lados, nunca un hueco— y con el salto más corto. La
         rotación no se ve: el scroll se compensa lo mismo que se desplaza el
         DOM, así que la pantalla queda idéntica y luego se desliza. */
      const better = (b, cand) =>
        !b ||
        (cand.interior && !b.interior) ||
        (cand.interior === b.interior && cand.d < b.d);
      let best = null;
      for (let r = 0; r < total && here - r >= 0; r++) {
        const p = (((target - order - r) % total) + total) % total;
        const cand = { r, p, d: Math.abs(p - (here - r)), interior: p > 0 && p < total - 1 };
        if (better(best, cand)) best = cand;
      }
      for (let n = 1; n < total && here + n <= total - 1; n++) {
        const p = (((target - order + n) % total) + total) % total;
        const cand = { r: -n, p, d: Math.abs(p - (here + n)), interior: p > 0 && p < total - 1 };
        if (better(best, cand)) best = cand;
      }
      for (let k = 0; k < best.r; k++) rotateForward();
      for (let k = 0; k < -best.r; k++) rotateBack();
      pos = best.p;
    }

    stopFrame();
    const from = track.scrollLeft;
    const to = pos * step();
    const steps = Math.max(1, Math.round(Math.abs(to - from) / step()));
    track.classList.add('no-snap');
    const start = performance.now();
    const ms = 260 + (steps - 1) * 150;
    const frame = (now) => {
      const t = Math.min((now - start) / ms, 1);
      track.scrollLeft = from + (to - from) * easeOutQuint(t);
      if (t < 1) {
        frameRaf = requestAnimationFrame(frame);
      } else {
        frameRaf = null;
        track.classList.remove('no-snap');
        sync();
      }
    };
    frameRaf = requestAnimationFrame(frame);
  };

  const dots = slides.map((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'carousel__dot';
    dot.setAttribute('aria-label', 'Ir al elemento ' + (i + 1));
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
    return dot;
  });

  const sync = () => {
    const i = currentIndex();
    dots.forEach((dot, j) => dot.classList.toggle('active', j === i));
    if (!wrap) {
      prevBtn.disabled = i === 0;
      nextBtn.disabled = i === total - 1;
    }
  };

  prevBtn.addEventListener('click', () => goTo(currentIndex() - 1));
  nextBtn.addEventListener('click', () => goTo(currentIndex() + 1));

  let raf;
  const onScroll = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(sync);
  };
  track.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  track
    .querySelectorAll('img')
    .forEach((img) => img.setAttribute('draggable', 'false'));

  let isDown = false;
  let startX = 0;
  let startScroll = 0;
  let lastX = 0;
  let lastT = 0;
  let vel = 0;
  let dragged = false;

  const onDown = (e) => {
    if (e.pointerType === 'touch') return;
    if (e.button !== undefined && e.button !== 0) return;
    stopFrame();
    isDown = true;
    dragged = false;
    vel = 0;
    startX = lastX = e.clientX;
    lastT = performance.now();
    startScroll = track.scrollLeft;
    track.classList.add('dragging', 'no-snap');
  };

  const onMove = (e) => {
    if (!isDown) return;
    const now = performance.now();
    const dt = Math.max(now - lastT, 1);
    vel = -(e.clientX - lastX) / dt;
    lastX = e.clientX;
    lastT = now;
    if (Math.abs(e.clientX - startX) > 5) dragged = true;
    const x = e.clientX;
    stopFrame();
    frameRaf = requestAnimationFrame(() => {
      track.scrollLeft = startScroll - (x - startX);
    });
  };

  const settle = () => {
    if (!dragged) {
      track.classList.remove('no-snap');
      return;
    }
    if (performance.now() - lastT > 60) vel = 0;

    stopFrame();
    if (Math.abs(vel) > 0.6) {
      /* Se acota la velocidad: sin tope, un gesto con un delta enorme en un
         solo frame dispara la inercia durante segundos. */
      let v = Math.max(-3, Math.min(3, vel));
      const frame = () => {
        v *= 0.92;
        track.scrollLeft += v * 16.7;
        /* Si el empujón llega al extremo, en vez de quedarse con un hueco se
           rota el DOM (invisible: el scroll se compensa) y el gesto sigue con la
           card siguiente, como si la rueda no tuviera fin. */
        const end = v > 0 ? maxScroll() : 0;
        if (Math.abs(track.scrollLeft - end) < 1) {
          if (v > 0) rotateForward();
          else rotateBack();
        }
        if (Math.abs(v) > 0.3) {
          frameRaf = requestAnimationFrame(frame);
        } else {
          frameRaf = null;
          goTo(currentIndex());
        }
      };
      frameRaf = requestAnimationFrame(frame);
    } else {
      /* Arrastrado lento: si se suelta pegado a un extremo se avanza una card
         en el sentido del gesto para no dejar el hueco delante. */
      const atMax = track.scrollLeft >= maxScroll() - 1;
      const atMin = track.scrollLeft <= 1;
      const dir = vel !== 0 ? Math.sign(vel) : Math.sign(startX - lastX);
      const extra = atMax && dir > 0 ? 1 : atMin && dir < 0 ? -1 : 0;
      goTo(currentIndex() + extra);
    }
  };

  const onUp = () => {
    if (!isDown) return;
    isDown = false;
    track.classList.remove('dragging');
    settle();
  };

  track.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  track.addEventListener(
    'click',
    (e) => {
      if (dragged) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  /* Arranque de la rueda: se adelanta una posición para que, con el primer caso
     ya centrado, la última card asome por la izquierda (y no un hueco). */
  if (wrap) rotateBack();

  sync();

  /* No avanza solo: la primera vez que el carrusel entra en pantalla, la
     flecha de «siguiente» da un pequeño empujón para avisar de que hay más
     (la animación está en el CSS, .is-hinting). */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      nextBtn.classList.add('is-hinting');
      nextBtn.addEventListener('animationend', () => nextBtn.classList.remove('is-hinting'), { once: true });
    }, { threshold: 0.5 });
    io.observe(root);
  }
}

document.querySelectorAll('[data-carousel]').forEach(initCarousel);

/* ============================================================
   Marcos de navegador con pestañas (caso del ecosistema en
   #cases): cada pestaña muestra su captura y cambia la URL de la
   barra. Flechas izquierda/derecha para moverse entre pestañas.
   ============================================================ */
document.querySelectorAll('[data-frame-tabs]').forEach((frame) => {
  const tabs = [...frame.querySelectorAll('[role="tab"]')];
  const url = frame.querySelector('[data-frame-url]');

  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    url.href = tab.dataset.url;
    url.textContent = tab.dataset.url.replace(/^https?:\/\//, '');
    if (focus) tab.focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const step = e.key === 'ArrowRight' ? 1 : tabs.length - 1;
      select(tabs[(i + step) % tabs.length], true);
    });
  });

  /* La primera vez que el marco se ve, las pestañas inactivas se iluminan una
     tras otra (.is-hinting, animación en el CSS) para que se note que se
     pueden pulsar. Se quita por tiempo y no en animationend: si se quedara
     puesta, se animaría cualquier pestaña que dejara de estar activa. */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      frame.classList.add('is-hinting');
      setTimeout(() => frame.classList.remove('is-hinting'), 2000);
    }, { threshold: 0.6 });
    io.observe(frame);
  }
});

/* ============================================================
   Marco con tira de clientes (caso de la agencia en #cases):
   cada logo con captura (data-shot) la enseña en el marco y
   cambia la URL de la barra, como los vídeos de la lista.
   ============================================================ */
document.querySelectorAll('[data-frame-clients]').forEach((root) => {
  const shot = root.querySelector('[data-frame-shot]');
  const url = root.querySelector('[data-frame-url]');
  const items = [...root.querySelectorAll('[data-shot]')];

  shot.addEventListener('load', () => shot.classList.remove('is-loading'));

  items.forEach((item) => {
    item.addEventListener('click', () => {
      if (item.getAttribute('aria-pressed') === 'true') return;
      items.forEach((i) => i.setAttribute('aria-pressed', String(i === item)));
      shot.classList.add('is-loading');
      shot.src = item.dataset.shot;
      shot.alt = item.dataset.alt;
      url.href = item.dataset.url;
      url.textContent = item.dataset.url.replace(/^https?:\/\/(www\.)?/, '');
    });
  });
});

/* ============================================================
   Al azar (portada): una película de data/ratings.json y una
   playlist de data/spoti.json elegidas al azar en cada visita;
   el botón «Otra» baraja sin recargar. El nombre y la carátula
   reales de la playlist salen del oEmbed de Spotify, con la
   misma caché que spoti.js (localStorage spoti:meta, 6 h).
   ============================================================ */
(function azar() {
  const root = document.getElementById('azar');
  if (!root) return;

  const filmCard = root.querySelector('[data-azar="film"]');
  const listCard = root.querySelector('[data-azar="playlist"]');
  const shuffleBtn = root.querySelector('[data-azar-shuffle]');

  const CACHE_KEY = 'spoti:meta';
  const CACHE_TTL = 6 * 60 * 60 * 1000;
  const OEMBED = 'https://open.spotify.com/oembed?url=';

  let films = [];
  let lists = [];
  let film = null;
  let list = null;

  /* Mismo proxy que cine.js: el hotlink a pics.filmaffinity.com da 403 */
  const posterUrl = (src) => {
    const bare = (src || '').replace(/^https?:\/\//i, '');
    if (!/^pics\.filmaffinity\.com\//i.test(bare)) return src || '';
    return 'https://images.weserv.nl/?url=' + bare + '&w=160&q=80&output=jpg';
  };

  const readCache = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!raw || !raw.meta || !raw.ts || Date.now() - raw.ts > CACHE_TTL) return {};
      return raw.meta;
    } catch {
      return {};
    }
  };

  const writeCache = (meta) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), meta }));
    } catch {
      /* modo privado o cuota llena: no es crítico */
    }
  };

  const playlistMeta = async (entry) => {
    const cache = readCache();
    if (cache[entry.id]) return cache[entry.id];
    try {
      const target = encodeURIComponent('https://open.spotify.com/playlist/' + entry.id);
      const res = await fetch(OEMBED + target);
      if (!res.ok) throw new Error('oEmbed respondió ' + res.status);
      const data = await res.json();
      if (!data.thumbnail_url) throw new Error('oEmbed sin carátula');
      const meta = { title: data.title || entry.name || '', cover: data.thumbnail_url };
      cache[entry.id] = meta;
      writeCache(cache);
      return meta;
    } catch {
      /* sin metadatos: nombre de respaldo de data/spoti.json y sin carátula */
      return { title: entry.name || 'Playlist', cover: '' };
    }
  };

  /* Precarga la imagen antes de mostrar la tarjeta, con un tope de espera */
  const preload = (src) =>
    new Promise((resolve) => {
      if (!src) return resolve();
      const probe = new Image();
      probe.onload = probe.onerror = resolve;
      probe.src = src;
      setTimeout(resolve, 1500);
    });

  const setImage = (card, src) => {
    const img = card.querySelector('img');
    if (src) img.src = src;
    else img.removeAttribute('src');
  };

  const showFilm = async (entry) => {
    const src = posterUrl(entry.poster);
    await preload(src);
    const title = entry.title + (entry.year ? ` (${entry.year})` : '');
    setImage(filmCard, src);
    filmCard.querySelector('.azar-card__title').textContent = title;
    filmCard.querySelector('[data-azar-rating]').textContent = entry.rating ? `★ ${entry.rating}/10` : '';
    filmCard.setAttribute('aria-label', `Película al azar: ${title}. Ver mi cine`);
  };

  const showList = async (entry) => {
    const meta = await playlistMeta(entry);
    await preload(meta.cover);
    setImage(listCard, meta.cover);
    listCard.querySelector('.azar-card__title').textContent = meta.title;
    listCard.setAttribute('aria-label', `Playlist al azar: ${meta.title}. Ver mi música`);
  };

  /* Elige otro elemento distinto del actual (si hay más de uno) */
  const pick = (items, current) => {
    if (items.length < 2) return items[0];
    let next;
    do {
      next = items[Math.floor(Math.random() * items.length)];
    } while (next === current);
    return next;
  };

  const swap = async (card, show) => {
    card.classList.add('is-swapping');
    await new Promise((resolve) => setTimeout(resolve, 250));
    await show();
    card.classList.remove('is-swapping');
  };

  const shuffle = () => {
    if (films.length) {
      film = pick(films, film);
      const entry = film;
      swap(filmCard, () => showFilm(entry));
    }
    if (lists.length) {
      list = pick(lists, list);
      const entry = list;
      swap(listCard, () => showList(entry));
    }
  };

  shuffleBtn.addEventListener('click', () => {
    shuffleBtn.classList.remove('is-spinning');
    void shuffleBtn.offsetWidth; /* reinicia la animación del icono */
    shuffleBtn.classList.add('is-spinning');
    shuffle();
  });

  const getJson = (url) =>
    fetch(url)
      .then((res) => res.json())
      .catch(() => []);

  Promise.all([getJson('data/ratings.json'), getJson('data/spoti.json')]).then(([ratings, playlists]) => {
    /* Solo recomienda lo que me gustó (7 o más); si no hubiera ninguna, cualquiera */
    const rated = (Array.isArray(ratings) ? ratings : []).filter((entry) => entry && entry.title);
    const liked = rated.filter((entry) => Number(entry.rating) >= 7);
    films = liked.length ? liked : rated;
    lists = (Array.isArray(playlists) ? playlists : []).filter((entry) => entry && entry.id);
    filmCard.hidden = !films.length;
    listCard.hidden = !lists.length;
    shuffleBtn.hidden = films.length < 2 && lists.length < 2;
    if (!films.length && !lists.length) {
      root.hidden = true;
      return;
    }
    shuffle();
  });
})();

/* ============================================================
   Vídeos (#videos): reproductor principal + lista de miniaturas
   desde data/videos.json ([{id, title}], id de YouTube). El
   principal empieza como portada (miniatura + botón) y el iframe
   de youtube-nocookie solo se crea al reproducir. Pulsar una
   miniatura la pasa al principal y arranca.
   ============================================================ */
(function videoHub() {
  const hub = document.getElementById('videoHub');
  if (!hub) return;

  const player = hub.querySelector('[data-video-player]');
  const titleEl = hub.querySelector('[data-video-title]');
  const list = hub.querySelector('[data-video-list]');
  const countEl = hub.querySelector('[data-video-count]');

  const PLAY_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.1v13.8a1 1 0 0 0 1.5.9l11-6.9a1 1 0 0 0 0-1.7l-11-6.9A1 1 0 0 0 8 5.1z"></path></svg>';
  const thumb = (id, size) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${size}.jpg`;

  let items = [];

  const play = (video) => {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?autoplay=1&rel=0`;
    iframe.title = video.title;
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.setAttribute('allowfullscreen', '');
    player.replaceChildren(iframe);
  };

  /* Portada del principal: maxresdefault y, si no existe (404), hqdefault */
  const poster = (video) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'video-hub__poster';
    btn.setAttribute('aria-label', 'Reproducir: ' + video.title);

    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.src = thumb(video.id, 'maxresdefault');
    img.addEventListener('error', () => {
      if (!img.src.includes('hqdefault')) img.src = thumb(video.id, 'hqdefault');
    });

    const icon = document.createElement('span');
    icon.className = 'video-hub__play';
    icon.innerHTML = PLAY_SVG;

    btn.append(img, icon);
    btn.addEventListener('click', () => play(video));
    return btn;
  };

  const select = (video, autoplay) => {
    titleEl.textContent = video.title;
    items.forEach(({ entry, btn, badge }) => {
      const on = entry === video;
      btn.setAttribute('aria-current', String(on));
      badge.hidden = !on;
    });
    if (autoplay) play(video);
    else player.replaceChildren(poster(video));
  };

  const buildItem = (video) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'video-hub__item';
    btn.setAttribute('aria-current', 'false');

    const frame = document.createElement('span');
    frame.className = 'video-hub__thumb';
    const img = document.createElement('img');
    img.src = thumb(video.id, 'hqdefault');
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    const badge = document.createElement('span');
    badge.className = 'video-hub__now';
    badge.textContent = 'Ahora';
    badge.hidden = true;
    frame.append(img, badge);

    const title = document.createElement('span');
    title.className = 'video-hub__item-title';
    title.textContent = video.title;

    btn.append(frame, title);
    btn.addEventListener('click', () => select(video, true));
    li.appendChild(btn);
    list.appendChild(li);
    return { entry: video, btn, badge };
  };

  fetch('data/videos.json')
    .then((res) => res.json())
    .then((data) => {
      const videos = (Array.isArray(data) ? data : []).filter((v) => v && v.id && v.title);
      if (!videos.length) throw new Error('data/videos.json vacío');
      items = videos.map(buildItem);
      countEl.textContent = `Más vídeos · ${videos.length}`;
      select(videos[0], false);
    })
    .catch((err) => {
      console.error('Error cargando vídeos:', err);
      hub.hidden = true;
    });
})();

/* ============================================================
   W de Sobre mí: gira sola (CSS) y, con ratón dentro de la
   sección, deja de girar y se inclina en 3D hacia el cursor.
   Al entrar arranca desde el ángulo en el que iba (leído del
   matrix3d) para no dar un salto; al salir vuelve de frente y
   se devuelve el control a la animación CSS, que empieza en 0°.
   Solo con ratón y sin "reducir movimiento".
   ============================================================ */
(function aboutTilt() {
  const section = document.getElementById('about');
  const logo = document.querySelector('.about-media__logo');
  if (!section || !logo) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const MAX = 28; /* grados de inclinación máxima */
  const anchor = logo.parentElement; /* el contenedor no rota: centro estable */
  let active = false;
  let followTimer;
  let leaveTimer;

  /* rotateY(θ) → matrix3d(cosθ, 0, -sinθ, 0, 0, 1, 0, 0, sinθ, 0, cosθ, 0, …) */
  const currentAngle = () => {
    const match = getComputedStyle(logo).transform.match(/matrix3d\((.+)\)/);
    if (!match) return 0;
    const v = match[1].split(',').map(Number);
    return (Math.atan2(v[8], v[0]) * 180) / Math.PI;
  };

  const enter = () => {
    clearTimeout(leaveTimer);
    if (active) return;
    active = true;
    const angle = currentAngle();
    logo.style.animation = 'none';
    logo.style.transition = 'none';
    logo.style.transform = `rotateX(0deg) rotateY(${angle.toFixed(1)}deg) scale(1)`;
    void logo.offsetWidth; /* fija el punto de partida antes de animar */
    logo.style.transition = 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)';
    /* tras el giro inicial, seguimiento más ágil */
    followTimer = setTimeout(() => {
      logo.style.transition = 'transform 0.18s ease-out';
    }, 600);
  };

  const clamp = (n) => Math.max(-1, Math.min(1, n));

  section.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    enter();
    const r = anchor.getBoundingClientRect();
    const s = section.getBoundingClientRect();
    const dx = clamp((e.clientX - (r.left + r.width / 2)) / (s.width / 2));
    const dy = clamp((e.clientY - (r.top + r.height / 2)) / (s.height / 2));
    logo.style.transform = `rotateX(${(-dy * MAX).toFixed(1)}deg) rotateY(${(dx * MAX).toFixed(1)}deg) scale(1.06)`;
  });

  section.addEventListener('pointerleave', () => {
    if (!active) return;
    clearTimeout(followTimer);
    logo.style.transition = 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)';
    logo.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
    leaveTimer = setTimeout(() => {
      active = false;
      logo.style.removeProperty('transform');
      logo.style.removeProperty('transition');
      logo.style.removeProperty('animation');
    }, 600);
  });
})();

/* ============================================================
   Aviso del CV: el mensaje bajo "¿Hablamos?" solo sale cuando se
   pulsa "Descargar CV" (enlazo del footer de las 3 páginas).
   Desde cine/spoti navega a index.html#contact-cv; allí se
   sustituye por #contact, se revela el aviso y se lleva al
   formulario con el foco en el nombre.
   ============================================================ */
(function cvNotice() {
  const note = document.getElementById('contactNote');
  const contact = document.getElementById('contact');

  const reveal = () => {
    if (!note || !note.hidden) return;
    note.hidden = false;
    requestAnimationFrame(() => note.classList.add('is-in'));
  };

  const open = (smooth) => {
    reveal();
    contact.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    const name = document.getElementById('contactName');
    if (name) setTimeout(() => name.focus({ preventScroll: true }), smooth ? 700 : 0);
  };

  document.querySelectorAll('.footer-link--cv').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (contact) open(true);
      else window.location.href = 'index.html#contact-cv';
    });
  });

  if (contact && window.location.hash === '#contact-cv') {
    history.replaceState(null, '', '#contact');
    open(false);
  }
})();

/* ============================================================
   Copiar email ([data-copy] en #contact): copia al portapapeles y
   cambia la etiqueta a «Copiado» un momento. Si la Clipboard API no
   está o la deniega el navegador, prueba con execCommand('copy') y,
   como último recurso, abre el correo con mailto.
   ============================================================ */
(function copyEmail() {
  const legacyCopy = (value) => {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  };

  document.querySelectorAll('[data-copy]').forEach((btn) => {
    const label = btn.querySelector('[data-copy-label]');
    const original = label ? label.textContent : '';
    let timer;

    btn.addEventListener('click', async () => {
      const value = btn.dataset.copy;
      let ok = false;
      try {
        await navigator.clipboard.writeText(value);
        ok = true;
      } catch {
        ok = legacyCopy(value);
      }
      if (!ok) {
        window.location.href = 'mailto:' + value;
        return;
      }
      btn.classList.add('is-copied');
      if (label) label.textContent = 'Copiado ✓';
      clearTimeout(timer);
      timer = setTimeout(() => {
        btn.classList.remove('is-copied');
        if (label) label.textContent = original;
      }, 2000);
    });
  });
})();

/* ============================================================
   Formulario de contacto (#contact) → FormSubmit
   Envío AJAX a formsubmit.co/ajax (reenvío a hola@wobocobo.com).
   Saneo en cliente + honeypot _honey; antispam de FormSubmit.
   ============================================================ */
(function contactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const status = document.getElementById('contactStatus');
  const btn = form.querySelector('button[type="submit"]');

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const LINK_RE = /(https?:\/\/|www\.)[^\s]+/gi;
  const MALICIOUS_RE =
    /(<script|<\/script|<\?php|<iframe|<svg|<|<\/|javascript:|vbscript:|onerror=|onload=|onclick=|onmouseover=|eval\(|document\.cookie|DROP TABLE|UNION SELECT|ALTER TABLE)/i;

  const clean = (v) =>
    (v || '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').trim();
  const stripTags = (v) => clean(v.replace(/<[^>]*>/g, ''));

  const setStatus = (msg, ok) => {
    status.textContent = msg;
    status.classList.toggle('contact-form__status--ok', ok);
    status.classList.toggle('contact-form__status--error', !ok);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = stripTags(form.name.value);
    const email = stripTags(form.email.value);
    const message = stripTags(form.message.value);
    const honey = clean(form._honey.value);

    if (name.length < 2 || name.length > 100) {
      setStatus('Revisa el nombre (2-100 caracteres).', false);
      return;
    }
    if (!EMAIL_RE.test(email) || email.length > 200) {
      setStatus('Revisa el email.', false);
      return;
    }
    if (message.length < 10 || message.length > 2000) {
      setStatus('El mensaje debe tener entre 10 y 2000 caracteres.', false);
      return;
    }
    if ((message.match(LINK_RE) || []).length > 3) {
      setStatus('Demasiados enlaces en el mensaje.', false);
      return;
    }
    if ([name, email, message].some((s) => MALICIOUS_RE.test(s))) {
      setStatus('Contenido no admitido. Elimina código o enlaces sospechosos del mensaje.', false);
      return;
    }
    if (honey) return;

    btn.disabled = true;
    btn.classList.add('btn--disabled');
    setStatus('Enviando…', false);

    try {
      const res = await fetch('https://formsubmit.co/ajax/hola@wobocobo.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message,
          _subject: 'Nuevo mensaje desde wobocobo.com',
          _honey: honey,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success === 'true') {
        form.reset();
        setStatus('Mensaje enviado, responderé cuanto antes.', true);
      } else {
        setStatus(data.message || 'No se pudo enviar. Inténtalo de nuevo.', false);
      }
    } catch {
      setStatus('Error de conexión. Inténtalo de nuevo en unos segundos.', false);
    } finally {
      btn.disabled = false;
      btn.classList.remove('btn--disabled');
    }
  });
})();
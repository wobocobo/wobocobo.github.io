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
   [data-prev]/[data-next] y puntos [data-dots]. Con
   [data-nav-anchor] las flechas se colocan a los lados (ver placeNav).
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

  /* Arrastre propio con ratón y con dedo (el CSS deja al navegador solo el
     scroll vertical: touch-action: pan-y). Con el dedo se encadenan gestos sin
     esperar a que pare nada: si el arrastre llega a un extremo del DOM, se
     rota sobre la marcha y sigue. */
  let isDown = false;
  let pointerType = 'mouse';
  let startX = 0;
  let startScroll = 0;
  let startIndex = 0;
  let lastX = 0;
  let lastT = 0;
  let vel = 0;
  let dragged = false;

  const onDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    stopFrame();
    isDown = true;
    pointerType = e.pointerType;
    dragged = false;
    vel = 0;
    startX = lastX = e.clientX;
    lastT = performance.now();
    startScroll = track.scrollLeft;
    startIndex = currentIndex();
    track.classList.add('no-snap');
    /* con el dedo, la card no se encoge hasta que de verdad se arrastra
       (un toque o un scroll vertical no deben hacerla parpadear) */
    if (pointerType !== 'touch') track.classList.add('dragging');
  };

  const onMove = (e) => {
    if (!isDown) return;
    const now = performance.now();
    const dt = Math.max(now - lastT, 1);
    vel = -(e.clientX - lastX) / dt;
    lastX = e.clientX;
    lastT = now;
    if (!dragged) {
      if (Math.abs(e.clientX - startX) <= 5) return;
      dragged = true;
      track.classList.add('dragging');
    }
    const x = e.clientX;
    stopFrame();
    frameRaf = requestAnimationFrame(() => {
      frameRaf = null;
      let to = startScroll - (x - startX);
      if (wrap && to < 1) {
        rotateBack();
        startScroll += step();
        to += step();
      } else if (wrap && to > maxScroll() - 1) {
        rotateForward();
        startScroll -= step();
        to -= step();
      }
      track.scrollLeft = to;
    });
  };

  const settle = (cancelled) => {
    if (!dragged) {
      track.classList.remove('no-snap');
      return;
    }
    if (performance.now() - lastT > 60) vel = 0;

    stopFrame();
    /* Con el dedo va como un pasador: cada gesto deja el caso más cercano y,
       si ha sido un golpe rápido, al menos uno más en ese sentido. Si el
       navegador se queda el gesto (scroll vertical), vuelve a su sitio. */
    if (pointerType === 'touch') {
      let target = currentIndex();
      if (!cancelled && Math.abs(vel) > 0.3 && target === startIndex) target += Math.sign(vel);
      goTo(target);
      return;
    }
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

  const onUp = (e) => {
    if (!isDown) return;
    isDown = false;
    track.classList.remove('dragging');
    settle(e.type === 'pointercancel');
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

  /* Con el trackpad (o la rueda horizontal) el desplazamiento es el scroll
     nativo, que no rota la rueda: al llegar al último slide del DOM se topaba
     con el final. Cuando el scroll se para en un extremo, se rota (invisible,
     como siempre) para que quede card a ambos lados. No se toca durante un
     arrastre ni durante un movimiento propio (no-snap). */
  if (wrap) {
    let settleTimer = null;
    const keepInterior = () => {
      if (isDown || track.classList.contains('no-snap')) return;
      const pos = Math.round(track.scrollLeft / step());
      if (pos <= 0) rotateBack();
      else if (pos >= total - 1) rotateForward();
    };
    track.addEventListener('scroll', () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(keepInterior, 140);
    }, { passive: true });
  }

  /* Flechas fuera del bloque, a media altura de un elemento de los slides
     ([data-nav-anchor]; en los casos, la captura): se deja en el root --nav-y
     y --nav-free (el hueco libre a la izquierda del track). Se toma la mediana
     de todos los slides para que no salten al cambiar (el del ecosistema
     tiene la captura más abajo por las pestañas). Si el hueco no da para una
     flecha, .is-nav-tight las monta sobre el borde (ver CSS). Se mide con
     offsets y no con getBoundingClientRect: AOS desplaza el viewport mientras
     aparece y la medida saldría corrida. */
  const anchorSel = root.dataset.navAnchor;
  if (anchorSel && 'ResizeObserver' in window) {
    const offsetIn = (el) => {
      let x = 0;
      let y = 0;
      for (; el && el !== root; el = el.offsetParent) {
        x += el.offsetLeft;
        y += el.offsetTop;
      }
      return { x, y };
    };
    const placeNav = () => {
      const ys = [...track.querySelectorAll(anchorSel)]
        .map((a) => offsetIn(a).y + a.offsetHeight / 2)
        .sort((a, b) => a - b);
      if (!ys.length) return;
      const free = offsetIn(track).x;
      root.style.setProperty('--nav-y', Math.round(ys[Math.floor(ys.length / 2)]) + 'px');
      root.style.setProperty('--nav-free', Math.round(free) + 'px');
      root.classList.toggle('is-nav-tight', free < 46);
    };
    const ro = new ResizeObserver(placeNav);
    ro.observe(track);
    ro.observe(root);
  }

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

/* ============================================================
   Guiño: un Spider-Man cruza la pantalla balanceándose de
   telaraña en telaraña. Lo lanza su cabeza, junto a la marca del
   header (en las tres páginas); en Música, además, sale solo la
   primera vez por visita (sessionStorage).

   Trayectoria: arcos de péndulo alrededor de anclas por encima de
   la ventana, unidos por saltos parabólicos (Bézier cuadrática =
   tiro parabólico) que salen a la velocidad del final del arco,
   para que no dé tirones. Al soltarse, la telaraña vieja se recoge
   y la nueva se lanza hacia la siguiente ancla.

   Figura: un muñeco articulado dibujado a mano en SVG. Cada pose
   son los ángulos de tronco, cabeza, brazos y piernas; según el
   tramo se mezcla entre poses (balanceo, salto encogido, bola de
   la voltereta final) y en cada fotograma se recalculan las piezas.
   ============================================================ */
(function spidey() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const btn = document.querySelector('[data-spidey]');
  const SEEN_KEY = 'spidey:seen';
  const THETA = (42 * Math.PI) / 180; // amplitud del arco
  const K = 0.45; // cuánto acelera en la parte baja del arco
  const START_DELAY = 700;

  const RED = '#d0202c';
  const RED_FAR = '#a3141f';
  const RED_DARK = '#4a070e';
  const BLUE = '#2453b8';
  const BLUE_FAR = '#1a3d8c';
  const BLUE_DARK = '#0a1838';

  /* medidas del muñeco, en unidades del dibujo (~105 de la mano a los pies) */
  const SEG = { torso: 30, neck: 9, upper: 17, fore: 16, hand: 4, thigh: 21, shin: 20, foot: 9 };

  /* poses: ángulos en grados; 0 = hacia abajo, 90 = hacia delante
     (derecha), 180 = hacia arriba. «a1» es el brazo de la telaraña. */
  const POSES = {
    swingA: { tor: 178, head: 168, a1u: 180, a1f: 180, a2u: -40, a2f: -10, l1t: -15, l1s: -45, l2t: -5, l2s: -30 },
    swingM: { tor: 175, head: 162, a1u: 180, a1f: 180, a2u: -15, a2f: 35, l1t: 35, l1s: -10, l2t: 12, l2s: -28 },
    swingB: { tor: 166, head: 152, a1u: 180, a1f: 180, a2u: 35, a2f: 80, l1t: 85, l1s: 30, l2t: 60, l2s: 8 },
    tuck: { tor: 160, head: 140, a1u: 150, a1f: 135, a2u: 60, a2f: 115, l1t: 110, l1s: -5, l2t: 95, l2s: -25 },
    ball: { tor: 150, head: 118, a1u: 85, a1f: 150, a2u: 70, a2f: 135, l1t: 140, l1s: 5, l2t: 128, l2s: -8 }
  };

  /* piezas en orden de pintado: [pose, desde, hasta, radio1, radio2, color] */
  const PARTS = [
    ['a1u', 'shoulder', 'e1', 3.6, 3, 'far'], // brazo de la telaraña, por detrás
    ['a1f', 'e1', 'w1', 3, 2.5, 'far'],
    ['a1h', 'w1', 'h1', 2.8, 2.4, 'far'],
    ['l2t', 'hip', 'k2', 5, 4, 'blueFar'], // pierna de atrás
    ['l2s', 'k2', 'an2', 4, 3.1, 'blueFar'],
    ['l2b', 'b2', 'an2', 3.5, 3.1, 'far'],
    ['l2f', 'an2', 'toe2', 3.1, 2.2, 'far'],
    ['tb', 'pelvis', 'chest', 6, 8.2, 'blue'], // tronco: azul a los lados, panel rojo delante
    ['tr', 'panelLow', 'panelTop', 3.4, 6, 'red'],
    'emblem',
    ['l1t', 'hip', 'k1', 5.2, 4.2, 'blue'], // pierna de delante
    ['l1s', 'k1', 'an1', 4.1, 3.2, 'blue'],
    ['l1b', 'b1', 'an1', 3.6, 3.2, 'red'],
    ['l1f', 'an1', 'toe1', 3.2, 2.3, 'red'],
    'head',
    ['a2u', 'shoulder', 'e2', 3.8, 3.1, 'red'], // brazo libre, por delante
    ['a2f', 'e2', 'w2', 3.1, 2.6, 'red'],
    ['a2h', 'w2', 'h2', 2.9, 2.4, 'red']
  ];
  const PAINT = {
    red: `fill="url(#spidey-web)" stroke="${RED_DARK}"`,
    far: `fill="url(#spidey-web-far)" stroke="${RED_DARK}"`,
    blue: `fill="${BLUE}" stroke="${BLUE_DARK}"`,
    blueFar: `fill="${BLUE_FAR}" stroke="${BLUE_DARK}"`
  };

  const webPattern = (id, color) =>
    `<pattern id="${id}" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
    `<rect width="3.2" height="3.2" fill="${color}"/>` +
    `<path d="M0 0H3.2M0 0V3.2" stroke="${RED_DARK}" stroke-width=".35" stroke-opacity=".55"/></pattern>`;

  /* cabeza de perfil a tres cuartos, mirando a la derecha (arriba = -y) */
  const HEAD =
    '<g data-part="head">' +
    `<ellipse rx="7.4" ry="8.8" fill="url(#spidey-web)" stroke="${RED_DARK}" stroke-width=".9"/>` +
    '<path d="M1.2 1.6Q.9-2.8 6.3-3.6Q6.4 1.6 1.2 1.6Z" fill="#fff" stroke="#111" stroke-width="1.1" stroke-linejoin="round"/>' +
    '<path d="M-.8 1.6Q-1-2.4-4.6-3Q-4.8 1.2-.8 1.6Z" fill="#fff" stroke="#111" stroke-width="1.1" stroke-linejoin="round"/>' +
    '</g>';

  const EMBLEM =
    '<g data-part="emblem" fill="#111">' +
    '<ellipse cy=".6" rx="1.2" ry="2.3"/><circle cy="-2.2" r="1"/>' +
    '<path fill="none" stroke="#111" stroke-width=".5" stroke-linecap="round" ' +
    'd="M0-1.2L-3.4-3.6M0-1.2L3.4-3.6M0-.4L-3.8-1M0-.4L3.8-1M0 .6L-3.6 2M0 .6L3.6 2M0 1.4L-2.8 4.2M0 1.4L2.8 4.2"/>' +
    '</g>';

  const dir = (a) => {
    const r = (a * Math.PI) / 180;
    return { x: Math.sin(r), y: Math.cos(r) };
  };
  const add = (p, a, len) => {
    const d = dir(a);
    return { x: p.x + d.x * len, y: p.y + d.y * len };
  };
  const lerp = (a, b, u) => a + (b - a) * u;
  const lerpPt = (p, q, u) => ({ x: lerp(p.x, q.x, u), y: lerp(p.y, q.y, u) });
  const easeOut = (u) => 1 - (1 - u) * (1 - u);
  const smooth = (u) => u * u * (3 - 2 * u);
  const mix = (a, b, u) => {
    const out = {};
    for (const k in a) out[k] = lerp(a[k], b[k], smooth(u));
    return out;
  };

  /* articulaciones de una pose, con la mano de la telaraña en (0, 0) */
  function rig(p) {
    const j = {};
    j.pelvis = { x: 0, y: 0 };
    j.hip = add(j.pelvis, p.tor, 1.5);
    const neck = add(j.pelvis, p.tor, SEG.torso);
    j.chest = add(neck, p.tor, -2);
    j.shoulder = add(neck, p.tor, -3);
    j.head = add(neck, p.head, SEG.neck);
    j.panelLow = add(add(j.pelvis, p.tor, 3), p.tor - 90, 1.8);
    j.panelTop = add(j.chest, p.tor - 90, 1.8);
    j.emblem = add(add(j.pelvis, p.tor, 21), p.tor - 90, 2);
    j.e1 = add(j.shoulder, p.a1u, SEG.upper);
    j.w1 = add(j.e1, p.a1f, SEG.fore);
    j.h1 = add(j.w1, p.a1f, SEG.hand);
    j.e2 = add(j.shoulder, p.a2u, SEG.upper);
    j.w2 = add(j.e2, p.a2f, SEG.fore);
    j.h2 = add(j.w2, p.a2f, SEG.hand);
    for (const n of [1, 2]) {
      const t = p[`l${n}t`];
      const s = p[`l${n}s`];
      j[`k${n}`] = add(j.hip, t, SEG.thigh);
      j[`an${n}`] = add(j[`k${n}`], s, SEG.shin);
      j[`b${n}`] = lerpPt(j[`k${n}`], j[`an${n}`], 0.45);
      j[`toe${n}`] = add(j[`an${n}`], s + 75, SEG.foot);
    }
    const { x, y } = j.h1;
    for (const k in j) j[k] = { x: j[k].x - x, y: j[k].y - y };
    return j;
  }

  /* pieza redondeada entre dos puntos, más gruesa en un extremo */
  function capsule(p, q, r1, r2) {
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const nx = -(q.y - p.y) / len;
    const ny = (q.x - p.x) / len;
    const f = (n) => n.toFixed(2);
    return (
      `M${f(p.x + nx * r1)} ${f(p.y + ny * r1)}L${f(q.x + nx * r2)} ${f(q.y + ny * r2)}` +
      `A${r2} ${r2} 0 0 0 ${f(q.x - nx * r2)} ${f(q.y - ny * r2)}` +
      `L${f(p.x - nx * r1)} ${f(p.y - ny * r1)}A${r1} ${r1} 0 0 0 ${f(p.x + nx * r1)} ${f(p.y + ny * r1)}Z`
    );
  }

  function build() {
    const root = document.createElement('div');
    root.className = 'spidey';
    root.setAttribute('aria-hidden', 'true');
    const parts = PARTS.map((part) => {
      if (part === 'emblem') return EMBLEM;
      if (part === 'head') return HEAD;
      return `<path data-part="${part[0]}" ${PAINT[part[5]]} stroke-width=".8" stroke-linejoin="round"/>`;
    }).join('');
    root.innerHTML =
      '<svg class="spidey__svg"><defs>' +
      webPattern('spidey-web', RED) +
      webPattern('spidey-web-far', RED_FAR) +
      '<filter id="spidey-shadow" x="-50%" y="-50%" width="200%" height="200%">' +
      '<feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".35"/></filter>' +
      '</defs><line class="spidey__web"/>' +
      `<g filter="url(#spidey-shadow)"><g class="spidey__man">${parts}</g></g></svg>`;
    document.body.appendChild(root);

    const q = (sel) => root.querySelector(sel);
    return {
      root,
      line: q('.spidey__web'),
      man: q('.spidey__man'),
      head: q('[data-part="head"]'),
      emblem: q('[data-part="emblem"]'),
      segs: PARTS.filter((p) => Array.isArray(p)).map((p) => [q(`[data-part="${p[0]}"]`), ...p.slice(1, 5)])
    };
  }

  let running = false;

  if (btn) {
    btn.hidden = false;
    btn.addEventListener('click', run);
  }

  /* En Música sale solo la primera vez por visita */
  if (document.getElementById('profile')) {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === '1';
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* sin sessionStorage sale en cada visita: no es grave */
    }
    if (!seen) setTimeout(run, START_DELAY);
  }

  function run() {
    if (running) return;
    running = true;

    const W = window.innerWidth;
    const H = window.innerHeight;
    const scale = W <= 560 ? 0.52 : 0.72; // ~55 px de alto en móvil, ~75 en escritorio
    const ay = -40; // las anclas, justo por encima de la ventana
    const L = H * 0.5 - ay; // el punto más bajo, a media pantalla
    const sin = Math.sin(THETA);
    const cos = Math.cos(THETA);
    const gap = 0.25 * L;
    const tArc = Math.min(1100, Math.max(780, L * 2));
    const endVel = (L * THETA * 2 * (1 - K)) / tArc; // px/ms al soltarse

    /* tramos: arcos alrededor de un ancla y saltos entre ellos */
    const segs = [];
    let ax = -30 + L * sin;
    for (;;) {
      segs.push({ type: 'arc', ax, dur: tArc });
      const p1 = { x: ax + L * sin, y: ay + L * cos };
      if (p1.x >= W * 0.7) {
        const d = (p1.y + 140) / sin;
        const c = { x: p1.x + d * cos, y: p1.y - d * sin };
        const p2 = { x: c.x + d * 0.5, y: c.y };
        segs.push({ type: 'exit', p1, c, p2, ax, dur: (2 * d) / endVel });
        break;
      }
      const nextAx = ax + 2 * L * sin + gap;
      const p2 = { x: nextAx - L * sin, y: p1.y };
      const c = { x: (p1.x + p2.x) / 2, y: p1.y - (gap / 2) * Math.tan(THETA) };
      segs.push({ type: 'jump', p1, c, p2, ax, nextAx, dur: gap / cos / endVel });
      ax = nextAx;
    }
    const total = segs.reduce((sum, s) => sum + s.dur, 0);

    const el = build();
    const anchor = (x) => ({ x, y: ay });
    const bezier = (s, u) => ({
      x: (1 - u) * (1 - u) * s.p1.x + 2 * (1 - u) * u * s.c.x + u * u * s.p2.x,
      y: (1 - u) * (1 - u) * s.p1.y + 2 * (1 - u) * u * s.c.y + u * u * s.p2.y
    });

    function frame(t) {
      let pos;
      let rot;
      let pose;
      let webFrom = null;
      let webTo = null;
      let s = segs[0];
      let local = t;
      for (s of segs) {
        if (local <= s.dur) break;
        local -= s.dur;
      }
      const u = Math.min(1, local / s.dur);

      if (s.type === 'arc') {
        const phi = THETA * ((1 - K) * (2 * u - 1) + K * Math.sin(Math.PI * (u - 0.5)));
        pos = { x: s.ax + L * Math.sin(phi), y: ay + L * Math.cos(phi) };
        rot = -phi;
        pose = u < 0.5 ? mix(POSES.swingA, POSES.swingM, u * 2) : mix(POSES.swingM, POSES.swingB, u * 2 - 1);
        webFrom = pos;
        webTo = anchor(s.ax);
      } else {
        pos = bezier(s, u);
        if (s.type === 'jump') {
          rot = lerp(-THETA, THETA, u);
          pose = u < 0.5 ? mix(POSES.swingB, POSES.tuck, u * 2) : mix(POSES.tuck, POSES.swingA, u * 2 - 1);
          if (u > 0.5) {
            const p = easeOut((u - 0.5) / 0.5);
            webFrom = pos;
            webTo = lerpPt(pos, anchor(s.nextAx), p);
          }
        } else {
          rot = -THETA + 2 * Math.PI * easeOut(u); // voltereta al irse
          pose = mix(POSES.swingB, POSES.ball, Math.min(1, u * 2.5));
        }
        if (u < 0.4 && !webFrom) {
          /* la telaraña soltada se recoge hacia su ancla */
          webFrom = lerpPt(s.p1, anchor(s.ax), easeOut(u / 0.4));
          webTo = anchor(s.ax);
        }
      }

      const j = rig(pose);
      for (const [path, from, to, r1, r2] of el.segs) path.setAttribute('d', capsule(j[from], j[to], r1, r2));
      el.head.setAttribute('transform', `translate(${j.head.x} ${j.head.y}) rotate(${180 - pose.head})`);
      el.emblem.setAttribute('transform', `translate(${j.emblem.x} ${j.emblem.y}) rotate(${180 - pose.tor})`);
      el.man.setAttribute('transform', `translate(${pos.x} ${pos.y}) rotate(${(rot * 180) / Math.PI}) scale(${scale})`);

      if (webFrom) {
        el.line.setAttribute('x1', webFrom.x);
        el.line.setAttribute('y1', webFrom.y);
        el.line.setAttribute('x2', webTo.x);
        el.line.setAttribute('y2', webTo.y);
        el.line.style.opacity = '';
      } else {
        el.line.style.opacity = '0';
      }
      return pos;
    }

    let start = null;
    function tick(now) {
      if (start === null) start = now;
      const t = Math.min(now - start, total);
      const pos = frame(t);
      /* se acaba al terminar la curva o en cuanto sale por arriba o por la derecha */
      if (t >= total || (t > segs[0].dur && (pos.y < -120 || pos.x > W + 100))) {
        el.root.remove();
        running = false;
        return;
      }
      requestAnimationFrame(tick);
    }
    frame(0);
    requestAnimationFrame(tick);
  }
})();
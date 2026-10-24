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
   Timeline: línea de progreso y nodos activos al hacer scroll
   La línea puede estar a la izquierda (móvil) o centrada (desktop).
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
  updateTimeline();
}

/* ============================================================
   Carrusel genérico (casos + vídeos)
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

  /* Con el sangrado de `padding-inline`, el slide de la posición p queda
     centrado justo con scrollLeft = p * step(), y el recorrido va de 0 a
     (total - 1) * step(). */
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
}

document.querySelectorAll('[data-carousel]').forEach(initCarousel);

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
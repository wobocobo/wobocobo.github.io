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
    toggle.textContent = light ? '☾' : '☀';
  };

  applyTheme(localStorage.getItem('theme') === 'light');

  toggle.addEventListener('click', () => {
    const light = !document.body.classList.contains('light-theme');
    localStorage.setItem('theme', light ? 'light' : 'dark');
    applyTheme(light);
  });
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
   Menú hamburguesa + dropdown (móvil)
   ============================================================ */
const toggleBtn = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
const dropdown = document.querySelector('.dropdown');
const dropdownToggle = document.querySelector('.dropdown-toggle');

if (toggleBtn && nav) {
  toggleBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    if (!open && dropdown) {
      dropdown.classList.remove('open');
    }
  });
}

if (dropdown && dropdownToggle) {
  dropdownToggle.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      dropdown.classList.toggle('open');
    }
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
   ============================================================ */
function initCarousel(root) {
  const track = root.querySelector('[data-track]');
  if (!track) return;

  const slides = [...track.children];
  const dotsWrap = root.querySelector('[data-dots]');
  const prevBtn = root.querySelector('[data-prev]');
  const nextBtn = root.querySelector('[data-next]');
  if (!dotsWrap || !prevBtn || !nextBtn) return;

  const dots = slides.map((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'carousel__dot';
    dot.setAttribute('aria-label', 'Ir al elemento ' + (i + 1));
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
    return dot;
  });

  const step = () =>
    slides[0].offsetWidth +
    parseFloat(getComputedStyle(track).columnGap || 0);

  const currentIndex = () => Math.round(track.scrollLeft / step());

  const goTo = (i) => {
    i = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: i * step(), behavior: 'smooth' });
  };

  const sync = () => {
    const i = currentIndex();
    dots.forEach((dot, j) => dot.classList.toggle('active', j === i));
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === slides.length - 1;
  };

  prevBtn.addEventListener('click', () => goTo(currentIndex() - 1));
  nextBtn.addEventListener('click', () => goTo(currentIndex() + 1));

  let raf;
  track.addEventListener(
    'scroll',
    () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    },
    { passive: true }
  );

  // Arrastre con ratón/touchpad: inercia + snap animado (rAF).
  // En touch el scroll nativo ya funciona.
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
  let frameRaf = null;

  const stopFrame = () => {
    if (frameRaf) {
      cancelAnimationFrame(frameRaf);
      frameRaf = null;
    }
  };

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  // Anima suavemente hasta quedar centrado en el slide `index`.
  const snapTo = (index, ms) => {
    const target = Math.max(0, Math.min(slides.length - 1, index)) * step();
    const from = track.scrollLeft;
    const start = performance.now();
    const frame = (now) => {
      const t = Math.min((now - start) / ms, 1);
      track.scrollLeft = from + (target - from) * easeOutCubic(t);
      if (t < 1) {
        frameRaf = requestAnimationFrame(frame);
      } else {
        frameRaf = null;
        track.classList.remove('no-snap');
      }
    };
    frameRaf = requestAnimationFrame(frame);
  };

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
    vel = -(e.clientX - lastX) / dt; // px por ms
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
    // Si el dedo llevaba tiempo quieto, sin inercia relevante
    if (performance.now() - lastT > 60) vel = 0;

    if (Math.abs(vel) > 0.6) {
      // Inercia: seguir con fricción y luego centrar
      let v = vel;
      const frame = () => {
        v *= 0.92;
        track.scrollLeft += v * 16.7;
        if (Math.abs(v) > 0.3) {
          frameRaf = requestAnimationFrame(frame);
        } else {
          frameRaf = null;
          snapTo(currentIndex(), 380);
        }
      };
      frameRaf = requestAnimationFrame(frame);
    } else {
      snapTo(currentIndex(), 300);
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

  sync();
}

document.querySelectorAll('[data-carousel]').forEach(initCarousel);
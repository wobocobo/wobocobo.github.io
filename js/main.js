// AOS
AOS.init({
  once: true,
  duration: 800,
  easing: 'ease-out-cubic'
});

// Menu hamburguesa
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
const dropdown = document.querySelector('.dropdown');
const dropdownToggle = document.querySelector('.dropdown-toggle');

if (toggle && nav) {
  toggle.addEventListener('click', () => {

    const isActive = nav.classList.toggle('active');

    // Si cerramos el menú principal, cerramos también el dropdown
    if (!isActive && dropdown) {
      dropdown.classList.remove('active');
    }
  });
}

if (dropdown && dropdownToggle) {
  dropdownToggle.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      dropdown.classList.toggle('active');
    }
  });
}

// Timeline: progreso de la línea y nodos activos al hacer scroll
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
      const markerY =
        marker.getBoundingClientRect().top - rect.top + marker.offsetHeight / 2;
      marker.classList.toggle('active', markerY <= passed);
    });
  };

  window.addEventListener('scroll', updateTimeline, { passive: true });
  window.addEventListener('resize', updateTimeline);
  updateTimeline();
}

// Carrusel de casos de trabajo
const casesTrack = document.getElementById('casesTrack');

if (casesTrack) {
  const cards = [...casesTrack.children];
  const dotsWrap = document.getElementById('casesDots');
  const prevBtn = document.getElementById('casesPrev');
  const nextBtn = document.getElementById('casesNext');

  const dots = cards.map((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'cases-dot';
    dot.setAttribute('aria-label', 'Ir al caso ' + (i + 1));
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
    return dot;
  });

  const step = () =>
    cards[0].offsetWidth +
    parseFloat(getComputedStyle(casesTrack).columnGap || 0);

  const currentIndex = () =>
    Math.round(casesTrack.scrollLeft / step());

  const goTo = (i) => {
    i = Math.max(0, Math.min(cards.length - 1, i));
    casesTrack.scrollTo({ left: i * step(), behavior: 'smooth' });
  };

  const sync = () => {
    const i = currentIndex();
    dots.forEach((dot, j) => dot.classList.toggle('active', j === i));
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === cards.length - 1;
  };

  prevBtn.addEventListener('click', () => goTo(currentIndex() - 1));
  nextBtn.addEventListener('click', () => goTo(currentIndex() + 1));

  let raf;
  casesTrack.addEventListener(
    'scroll',
    () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    },
    { passive: true }
  );

  sync();
}
/* ============================================================
   Playlists de Spotify (spoti.html)
   Cards con carátula y vinilo que montan el embed bajo demanda:
   la página no descarga N iframes de Spotify y solo hay un
   reproductor activo a la vez.

   El reproductor es un tocadiscos (#player): plato con el vinilo de
   la playlist y el embed de Spotify al lado. En escritorio flota en
   una esquina, se arrastra por su barra y se minimiza a un vinilo;
   en móvil es una hoja abajo que se cierra deslizándola. El embed se
   monta con la API oficial de Spotify (iFrame API), que permite darle
   al play desde «Una al azar»; si no carga, un iframe normal. Al
   cerrar se destruye el embed, que es lo que corta el audio.

   El nombre y la carátula NO están en el repo: se piden al oEmbed
   de Spotify (`access-control-allow-origin: *`, sin API key ni
   token) y se cachean unas horas en localStorage. Si mañana
   cambias una carátula en Spotify, la web la enseña sola. Con esas
   carátulas se rellena también el mosaico de la cabecera.
   ============================================================ */
(function spoti() {
  const grid = document.getElementById('playlists');
  const player = document.getElementById('player');
  if (!grid || !player) return;

  const mosaic = document.querySelector('[data-mosaic]');
  const shuffleBtn = document.querySelector('[data-shuffle]');
  const countEl = document.querySelector('[data-count]');

  const OEMBED = 'https://open.spotify.com/oembed?url=';
  const CACHE_KEY = 'spoti:meta';
  const CACHE_TTL = 6 * 60 * 60 * 1000;
  const IFRAME_ALLOW = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
  const IFRAME_API = 'https://open.spotify.com/embed/iframe-api/v1';
  const EMBED_HEIGHT = 352;
  const MOSAIC_TILES = 28;
  const CONCURRENCY = 3;

  const NS = 'http://www.w3.org/2000/svg';

  const PLAY_SVG =
    '<svg class="pl-card__icon pl-card__icon--play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.14-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z"/></svg>' +
    '<svg class="pl-card__icon pl-card__icon--stop" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>';

  const closeSvg = document.createElementNS(NS, 'svg');
  closeSvg.setAttribute('viewBox', '0 0 24 24');
  closeSvg.setAttribute('fill', 'none');
  closeSvg.setAttribute('stroke', 'currentColor');
  closeSvg.setAttribute('stroke-width', '2.2');
  closeSvg.setAttribute('stroke-linecap', 'round');
  closeSvg.setAttribute('aria-hidden', 'true');
  const closePath = document.createElementNS(NS, 'path');
  closePath.setAttribute('d', 'M6 6l12 12M18 6L6 18');
  closeSvg.appendChild(closePath);

  let cache = readCache();
  let active = null;
  let cards = [];
  let tiles = [];

  /* ---------- caché de metadatos ---------- */

  function readCache() {
    try {
      const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!raw || !raw.meta || !raw.ts) return {};
      if (Date.now() - raw.ts > CACHE_TTL) return {};
      return raw.meta;
    } catch {
      return {};
    }
  }

  function writeCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), meta: cache }));
    } catch {
      /* modo privado o cuota llena: no es crítico */
    }
  }

  async function fetchMeta(id) {
    const target = encodeURIComponent('https://open.spotify.com/playlist/' + id);
    const res = await fetch(OEMBED + target);
    if (!res.ok) throw new Error('oEmbed respondió ' + res.status);
    const data = await res.json();
    if (!data.thumbnail_url) throw new Error('oEmbed sin carátula');
    return { title: data.title || '', cover: data.thumbnail_url };
  }

  /* ---------- reproductor (tocadiscos) ---------- */

  const playerTitle = document.createElement('p');
  playerTitle.className = 'pl-player__title';

  const playerLabel = document.createElement('span');
  playerLabel.className = 'pl-player__label';
  playerLabel.textContent = 'Reproduciendo';

  const playerEq = document.createElement('span');
  playerEq.className = 'pl-player__eq';
  playerEq.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 4; i++) playerEq.appendChild(document.createElement('span'));

  const playerClose = document.createElement('button');
  playerClose.type = 'button';
  playerClose.className = 'pl-player__close';
  playerClose.appendChild(closeSvg);
  const closeText = document.createElement('span');
  closeText.textContent = 'Cerrar';
  playerClose.appendChild(closeText);
  playerClose.addEventListener('click', () => close());

  const playerEmbed = document.createElement('div');
  playerEmbed.className = 'pl-player__embed';

  const playerText = document.createElement('div');
  playerText.className = 'pl-player__text';
  playerText.append(playerLabel, playerTitle);

  const playerMin = document.createElement('button');
  playerMin.type = 'button';
  playerMin.className = 'pl-player__min';
  playerMin.setAttribute('aria-label', 'Minimizar el reproductor');
  playerMin.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>';
  playerMin.addEventListener('click', () => setMinimized(true));

  /* Minimizado, todo el vinilo es el botón para volver a abrirlo (y se
     arrastra: ver más abajo) */
  const playerRestore = document.createElement('button');
  playerRestore.type = 'button';
  playerRestore.className = 'pl-player__restore';
  playerRestore.setAttribute('aria-label', 'Abrir el reproductor');
  playerRestore.hidden = true;

  const playerHead = document.createElement('div');
  playerHead.className = 'pl-player__head';
  playerHead.append(playerEq, playerText, playerMin, playerClose);

  /* Tocadiscos: plato con el vinilo (la etiqueta es la carátula), brazo,
     piloto y selector de velocidad. Solo decorativo. */
  const deck = document.createElement('div');
  deck.className = 'pl-deck';
  deck.setAttribute('aria-hidden', 'true');
  deck.innerHTML =
    '<span class="pl-deck__platter"><span class="pl-deck__record"><span class="pl-deck__label"><img alt=""></span></span></span>' +
    '<span class="pl-deck__arm"></span>' +
    '<span class="pl-deck__led"></span>' +
    '<span class="pl-deck__speed">33</span>';
  const deckLabel = deck.querySelector('.pl-deck__label img');

  player.append(deck, playerHead, playerEmbed, playerRestore);

  /* En móvil la hoja tapa el final de la página: el body reserva su alto
     (--player-h, lo usa el CSS de ≤760px) y la flecha de volver arriba se sube */
  const syncPlayerSpace = () => {
    document.body.style.setProperty('--player-h', player.offsetHeight + 'px');
  };
  /* Al cambiar de tamaño (minimizar, restaurar o cuando llega el embed, que
     carga después) se recoloca para no salirse de la ventana */
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      syncPlayerSpace();
      keepInView();
    }).observe(player);
  }

  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

  /* En móvil el vinilo recuerda dónde se dejó la última vez (abierto, el
     reproductor es la hoja de abajo y no tiene posición propia) */
  let miniPos = null;

  function setMinimized(on) {
    player.classList.toggle('is-minimized', on);
    playerRestore.hidden = !on;
    (on ? playerRestore : playerMin).focus({ preventScroll: true });
    if (on && isMobile() && miniPos) placeAt(miniPos.left, miniPos.top);
    if (!on) keepInView();
  }

  /* Escritorio: se arrastra por la barra de arriba (left/top en línea, sin
     salirse de la ventana). Móvil: la barra se desliza hacia abajo y, pasado
     un tramo, cierra. */
  function placeAt(left, top) {
    const margin = 8;
    const maxLeft = window.innerWidth - player.offsetWidth - margin;
    const maxTop = window.innerHeight - player.offsetHeight - margin;
    player.style.left = Math.min(Math.max(margin, left), maxLeft) + 'px';
    player.style.top = Math.min(Math.max(margin, top), maxTop) + 'px';
    player.style.right = 'auto';
    player.style.bottom = 'auto';
  }

  function resetPlacement() {
    ['left', 'top', 'right', 'bottom', 'transform'].forEach(prop => (player.style[prop] = ''));
  }

  function keepInView() {
    if (isMobile() && !player.classList.contains('is-minimized')) resetPlacement();
    else if (player.style.left) placeAt(parseFloat(player.style.left), parseFloat(player.style.top));
  }
  window.addEventListener('resize', keepInView);

  let drag = null;
  playerHead.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('button')) return;
    const rect = player.getBoundingClientRect();
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, left: rect.left, top: rect.top, mobile: isMobile() };
    playerHead.setPointerCapture(e.pointerId);
    player.classList.add('is-dragging');
  });
  playerHead.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (drag.mobile) player.style.transform = `translateY(${Math.max(0, dy)}px)`;
    else placeAt(drag.left + dx, drag.top + dy);
  });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const { mobile, y } = drag;
    drag = null;
    player.classList.remove('is-dragging');
    if (!mobile) return;
    player.style.transform = '';
    if (e.clientY - y > 90) close();
  };
  playerHead.addEventListener('pointerup', endDrag);
  playerHead.addEventListener('pointercancel', endDrag);

  /* El vinilo minimizado se arrastra con ratón o dedo. Hasta que no se mueve
     unos píxeles es un toque normal; si se ha arrastrado, soltar no lo abre. */
  let miniDrag = null;
  let miniMoved = false;
  playerRestore.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const rect = player.getBoundingClientRect();
    miniDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
    miniMoved = false;
    playerRestore.setPointerCapture(e.pointerId);
  });
  playerRestore.addEventListener('pointermove', e => {
    if (!miniDrag || e.pointerId !== miniDrag.id) return;
    const dx = e.clientX - miniDrag.x;
    const dy = e.clientY - miniDrag.y;
    if (!miniMoved) {
      if (Math.hypot(dx, dy) < 6) return;
      miniMoved = true;
      player.classList.add('is-dragging');
    }
    placeAt(miniDrag.left + dx, miniDrag.top + dy);
  });
  const endMiniDrag = e => {
    if (!miniDrag || e.pointerId !== miniDrag.id) return;
    miniDrag = null;
    player.classList.remove('is-dragging');
    if (miniMoved && isMobile()) {
      const rect = player.getBoundingClientRect();
      miniPos = { left: rect.left, top: rect.top };
    }
    /* tras un pointercancel no llega clic que lo consuma */
    if (e.type === 'pointercancel') miniMoved = false;
  };
  playerRestore.addEventListener('pointerup', endMiniDrag);
  playerRestore.addEventListener('pointercancel', endMiniDrag);
  playerRestore.addEventListener('click', () => {
    if (miniMoved) {
      miniMoved = false;
      return;
    }
    setMinimized(false);
  });

  /* ---------- embed de Spotify ---------- */

  /* La API oficial se carga solo la primera vez que se abre el reproductor */
  let iframeApi = null;
  function loadIframeApi() {
    if (!iframeApi) {
      iframeApi = new Promise((resolve, reject) => {
        window.onSpotifyIframeApiReady = resolve;
        const script = document.createElement('script');
        script.src = IFRAME_API;
        script.async = true;
        script.onerror = reject;
        document.body.appendChild(script);
        setTimeout(() => reject(new Error('La API de Spotify no responde')), 8000);
      });
    }
    return iframeApi;
  }

  let controller = null;
  let embedToken = 0;

  function destroyEmbed() {
    embedToken++;
    if (controller) controller.destroy();
    controller = null;
    player.classList.remove('is-paused');
    playerEmbed.replaceChildren();
  }

  /* Cada apertura monta un embed nuevo (quitar el anterior corta su audio).
     Con autoplay, la API le da al play en cuanto está listo; el navegador
     puede bloquearlo (Safari lo hace) y entonces queda listo para pulsar. */
  function mountEmbed(card, autoplay) {
    destroyEmbed();
    const token = embedToken;
    const title = 'Reproductor de Spotify: ' + card.dataset.title;
    const slot = document.createElement('div');
    playerEmbed.appendChild(slot);

    loadIframeApi()
      .then(IFrameAPI => {
        if (token !== embedToken) return;
        const options = { uri: 'spotify:playlist:' + card.dataset.id, width: '100%', height: EMBED_HEIGHT };
        IFrameAPI.createController(slot, options, ctrl => {
          if (token !== embedToken) {
            ctrl.destroy();
            return;
          }
          controller = ctrl;
          const iframe = playerEmbed.querySelector('iframe');
          if (iframe) iframe.title = title;
          if (autoplay) ctrl.addListener('ready', () => controller === ctrl && ctrl.play());
          /* en pausa, el vinilo minimizado deja de latir (sin la API late siempre) */
          ctrl.addListener('playback_update', e => {
            if (controller === ctrl) player.classList.toggle('is-paused', e.data.isPaused);
          });
        });
      })
      .catch(() => {
        if (token !== embedToken) return;
        const iframe = document.createElement('iframe');
        iframe.src = 'https://open.spotify.com/embed/playlist/' + card.dataset.id;
        iframe.width = '100%';
        iframe.height = String(EMBED_HEIGHT);
        iframe.allow = IFRAME_ALLOW;
        iframe.setAttribute('allowfullscreen', '');
        iframe.title = title;
        playerEmbed.replaceChildren(iframe);
      });
  }

  /* ---------- mosaico de la cabecera ---------- */

  function buildMosaic(total) {
    if (!mosaic || !total) return;
    tiles = Array.from({ length: MOSAIC_TILES }, () => {
      const img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.addEventListener('load', () => img.classList.add('is-loaded'));
      mosaic.appendChild(img);
      return img;
    });
  }

  /* Cada carátula ocupa las casillas i, i + total, i + 2·total… */
  function paintMosaic(index, total, cover) {
    for (let i = index; i < tiles.length; i += total) {
      if (tiles[i].getAttribute('src') !== cover) tiles[i].setAttribute('src', cover);
    }
  }

  /* ---------- card ---------- */

  function buildCard(entry, index) {
    const title = entry.name || 'Playlist';

    const card = document.createElement('article');
    card.className = 'pl-card';
    card.dataset.id = entry.id;
    card.dataset.title = title;
    card.dataset.index = index;

    const media = document.createElement('div');
    media.className = 'pl-card__media';

    /* El vinilo va detrás de la funda; la etiqueta del centro es la carátula */
    const vinyl = document.createElement('span');
    vinyl.className = 'pl-card__vinyl';
    vinyl.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'pl-card__label';
    const labelImg = document.createElement('img');
    labelImg.alt = '';
    labelImg.loading = 'lazy';
    labelImg.decoding = 'async';
    label.appendChild(labelImg);
    vinyl.appendChild(label);

    const cover = document.createElement('div');
    cover.className = 'pl-card__cover';

    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('load', () => img.classList.add('is-loaded'));
    cover.appendChild(img);

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'pl-card__play';
    playBtn.innerHTML = PLAY_SVG;
    playBtn.setAttribute('aria-label', 'Reproducir ' + title);
    playBtn.setAttribute('aria-expanded', 'false');
    playBtn.addEventListener('click', () => (active === card ? close() : open(card)));
    cover.appendChild(playBtn);

    media.append(vinyl, cover);

    const info = document.createElement('div');
    info.className = 'pl-card__info';

    const eq = document.createElement('span');
    eq.className = 'pl-card__eq';
    eq.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) eq.appendChild(document.createElement('span'));

    const h3 = document.createElement('h3');
    h3.className = 'pl-card__title';
    h3.textContent = title;
    info.append(eq, h3);

    if (entry.note) {
      const note = document.createElement('p');
      note.className = 'pl-card__note';
      note.textContent = entry.note;
      info.appendChild(note);
    }

    card.append(media, info);
    return card;
  }

  function paint(card, meta) {
    const title = meta.title || card.dataset.title;

    card.dataset.title = title;
    card.querySelector('.pl-card__title').textContent = title;
    if (active !== card) card.querySelector('.pl-card__play').setAttribute('aria-label', 'Reproducir ' + title);

    for (const img of card.querySelectorAll('.pl-card__cover img, .pl-card__label img')) {
      if (img.getAttribute('src') !== meta.cover) img.setAttribute('src', meta.cover);
    }
    paintMosaic(Number(card.dataset.index), cards.length, meta.cover);
  }

  async function hydrate(card) {
    const id = card.dataset.id;

    if (cache[id]) {
      paint(card, cache[id]);
      return;
    }

    try {
      const meta = await fetchMeta(id);
      cache[id] = meta;
      writeCache();
      paint(card, meta);
    } catch {
      /* sin metadatos: se queda el nombre de data/spoti.json y el
         embed sigue funcionando, porque solo necesita el ID */
    }
  }

  /* Todas a la vez no: de pocas en pocas, para no disparar el límite de
     peticiones del oEmbed (el mosaico las necesita todas pronto) */
  async function hydrateAll(list) {
    const queue = [...list];
    const worker = async () => {
      while (queue.length) await hydrate(queue.shift());
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }

  /* ---------- abrir / cerrar ---------- */

  let hideTimer = null;
  let cueTimer = null;

  function open(card, { autoplay = false } = {}) {
    if (active === card) {
      close();
      return;
    }

    playerTitle.textContent = card.dataset.title;
    playerClose.setAttribute('aria-label', 'Cerrar el reproductor de ' + card.dataset.title);
    playerRestore.setAttribute('aria-label', 'Abrir el reproductor de ' + card.dataset.title);

    const cover = card.querySelector('.pl-card__cover img').getAttribute('src');
    if (cover) deckLabel.setAttribute('src', cover);
    else deckLabel.removeAttribute('src');

    /* Cambio de disco con el tocadiscos ya abierto: el brazo se levanta y
       vuelve a bajar (.is-cueing) */
    if (active) {
      deactivate(active);
      player.classList.add('is-cueing');
      clearTimeout(cueTimer);
      cueTimer = setTimeout(() => player.classList.remove('is-cueing'), 650);
    }

    mountEmbed(card, autoplay);

    clearTimeout(hideTimer);
    if (player.classList.contains('is-minimized')) setMinimized(false);
    player.hidden = false;
    void player.offsetWidth; /* sin este reflow no hay transición de entrada */
    player.classList.add('is-open');
    document.body.classList.add('player-open');
    syncPlayerSpace();

    card.classList.add('pl-card--active');
    const playBtn = card.querySelector('.pl-card__play');
    playBtn.setAttribute('aria-expanded', 'true');
    playBtn.setAttribute('aria-label', 'Cerrar el reproductor de ' + card.dataset.title);
    active = card;
  }

  function deactivate(card) {
    card.classList.remove('pl-card--active');
    const playBtn = card.querySelector('.pl-card__play');
    playBtn.setAttribute('aria-expanded', 'false');
    playBtn.setAttribute('aria-label', 'Reproducir ' + card.dataset.title);
  }

  function close() {
    /* destruir el embed corta el audio */
    destroyEmbed();
    player.classList.remove('is-open', 'is-cueing', 'is-minimized');
    playerRestore.hidden = true;
    document.body.classList.remove('player-open');
    hideTimer = setTimeout(() => {
      player.hidden = true;
      player.style.transform = '';
    }, 400);

    if (active) deactivate(active);
    active = null;
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && active) close();
  });

  /* «Una al azar»: abre otra playlist cualquiera, le da al play y la trae a la vista */
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
      const pool = cards.filter(card => card !== active);
      if (!pool.length) return;
      const card = pool[Math.floor(Math.random() * pool.length)];
      open(card, { autoplay: true });
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* ---------- carga ---------- */

  fetch('data/spoti.json')
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        grid.innerHTML = '<p class="pl-empty">Todavía no hay playlists en data/spoti.json.</p>';
        return;
      }

      cards = data.filter(entry => entry && entry.id).map((entry, i) => {
        const card = buildCard(entry, i);
        grid.appendChild(card);
        return card;
      });

      if (countEl) countEl.textContent = `${cards.length} playlists · pulsa una portada para escucharla.`;
      if (shuffleBtn) shuffleBtn.hidden = cards.length < 2;

      buildMosaic(cards.length);
      hydrateAll(cards);
    })
    .catch(err => {
      console.error('Error cargando playlists:', err);
      grid.innerHTML = '<p class="pl-empty">No se ha podido cargar data/spoti.json.</p>';
    });
})();

/* ============================================================
   Guiño: un Spider-Man cruza la pantalla balanceándose de
   telaraña en telaraña. Sale solo la primera vez por visita
   (sessionStorage); el botón con su cabeza, arriba a la izquierda
   de la cabecera, lo repite.

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
  if (!document.getElementById('profile')) return;
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

  const dir = a => {
    const r = (a * Math.PI) / 180;
    return { x: Math.sin(r), y: Math.cos(r) };
  };
  const add = (p, a, len) => {
    const d = dir(a);
    return { x: p.x + d.x * len, y: p.y + d.y * len };
  };
  const lerp = (a, b, u) => a + (b - a) * u;
  const lerpPt = (p, q, u) => ({ x: lerp(p.x, q.x, u), y: lerp(p.y, q.y, u) });
  const easeOut = u => 1 - (1 - u) * (1 - u);
  const smooth = u => u * u * (3 - 2 * u);
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
    const f = n => n.toFixed(2);
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
    const parts = PARTS.map(part => {
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

    const q = sel => root.querySelector(sel);
    return {
      root,
      line: q('.spidey__web'),
      man: q('.spidey__man'),
      head: q('[data-part="head"]'),
      emblem: q('[data-part="emblem"]'),
      segs: PARTS.filter(p => Array.isArray(p)).map(p => [q(`[data-part="${p[0]}"]`), ...p.slice(1, 5)])
    };
  }

  let running = false;

  if (btn) {
    btn.hidden = false;
    btn.addEventListener('click', run);
  }

  let seen = false;
  try {
    seen = sessionStorage.getItem(SEEN_KEY) === '1';
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* sin sessionStorage sale en cada visita: no es grave */
  }
  if (!seen) setTimeout(run, START_DELAY);

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
    const anchor = x => ({ x, y: ay });
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

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

  /* Minimizado, todo el vinilo es el botón para volver a abrirlo */
  const playerRestore = document.createElement('button');
  playerRestore.type = 'button';
  playerRestore.className = 'pl-player__restore';
  playerRestore.hidden = true;
  playerRestore.addEventListener('click', () => setMinimized(false));

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
  if ('ResizeObserver' in window) new ResizeObserver(syncPlayerSpace).observe(player);

  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

  function setMinimized(on) {
    player.classList.toggle('is-minimized', on);
    playerRestore.hidden = !on;
    (on ? playerRestore : playerMin).focus({ preventScroll: true });
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
    if (isMobile()) resetPlacement();
    else if (player.style.left) {
      const rect = player.getBoundingClientRect();
      placeAt(rect.left, rect.top);
    }
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

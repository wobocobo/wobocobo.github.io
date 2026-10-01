/* ============================================================
   Playlists de Spotify (spoti.html)
   Cards con carátula que montan el embed bajo demanda: la página
   no descarga N iframes de Spotify y solo hay un reproductor
   activo a la vez.

   El reproductor vive en un hueco fijo (#player) encima del grid,
   no dentro de la card: así el grid nunca salta y siempre se abre
   en el mismo sitio. Al cerrar se elimina el iframe, que es lo que
   corta el audio.

   El nombre y la carátula NO están en el repo: se piden al oEmbed
   de Spotify (`access-control-allow-origin: *`, sin API key ni
   token) y se cachean unas horas en localStorage. Si mañana
   cambias una carátula en Spotify, la web la enseña sola.
   ============================================================ */
(function spoti() {
  const grid = document.getElementById('playlists');
  const player = document.getElementById('player');
  if (!grid || !player) return;

  const OEMBED = 'https://open.spotify.com/oembed?url=';
  const CACHE_KEY = 'spoti:meta';
  const CACHE_TTL = 6 * 60 * 60 * 1000;
  const IFRAME_ALLOW = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';

  const NS = 'http://www.w3.org/2000/svg';

  const PLAY_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.14-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z"/></svg>';

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

  /* ---------- reproductor fijo ---------- */

  const playerTitle = document.createElement('h3');
  playerTitle.className = 'pl-player__title';

  const playerLabel = document.createElement('p');
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
  playerClose.appendChild(document.createTextNode('Cerrar'));
  playerClose.addEventListener('click', () => close());

  const playerEmbed = document.createElement('div');
  playerEmbed.className = 'pl-player__embed';

  const playerHead = document.createElement('div');
  playerHead.className = 'pl-player__head';
  playerHead.append(playerEq, playerLabel, playerTitle, playerClose);

  player.append(playerHead, playerEmbed);

  /* ---------- card ---------- */

  function buildCard(entry) {
    const title = entry.name || 'Playlist';

    const card = document.createElement('article');
    card.className = 'pl-card';
    card.dataset.id = entry.id;
    card.dataset.title = title;

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

    const info = document.createElement('div');
    info.className = 'pl-card__info';

    const h4 = document.createElement('h4');
    h4.className = 'pl-card__title';
    h4.textContent = title;
    info.appendChild(h4);

    if (entry.note) {
      const note = document.createElement('p');
      note.className = 'pl-card__note';
      note.textContent = entry.note;
      info.appendChild(note);
    }

    card.append(cover, info);
    return card;
  }

  function paint(card, meta) {
    const title = meta.title || card.dataset.title;

    card.dataset.title = title;
    card.querySelector('.pl-card__title').textContent = title;
    card.querySelector('.pl-card__play').setAttribute('aria-label', 'Reproducir ' + title);

    const img = card.querySelector('.pl-card__cover img');
    if (img.getAttribute('src') !== meta.cover) img.setAttribute('src', meta.cover);
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

  /* ---------- abrir / cerrar ---------- */

  function open(card) {
    if (active === card) {
      close();
      return;
    }

    playerTitle.textContent = card.dataset.title;
    playerClose.setAttribute('aria-label', 'Cerrar el reproductor de ' + card.dataset.title);

    if (active) deactivate(active);

    /* quitar el iframe anterior es lo que corta el audio */
    playerEmbed.replaceChildren();

    const iframe = document.createElement('iframe');
    iframe.src = 'https://open.spotify.com/embed/playlist/' + card.dataset.id;
    iframe.width = '100%';
    iframe.height = '352';
    iframe.loading = 'lazy';
    iframe.allow = IFRAME_ALLOW;
    iframe.setAttribute('allowfullscreen', '');
    iframe.title = 'Reproductor de Spotify: ' + card.dataset.title;
    iframe.style.borderRadius = '12px';
    playerEmbed.appendChild(iframe);

    player.hidden = false;
    card.classList.add('pl-card--active');
    card.querySelector('.pl-card__play').setAttribute('aria-expanded', 'true');
    active = card;

    player.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function deactivate(card) {
    card.classList.remove('pl-card--active');
    card.querySelector('.pl-card__play').setAttribute('aria-expanded', 'false');
  }

  function close() {
    /* quitar el iframe destruye el player y corta el audio */
    playerEmbed.replaceChildren();
    player.hidden = true;

    if (active) deactivate(active);
    active = null;
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !player.hidden) close();
  });

  /* ---------- carga ---------- */

  fetch('data/spoti.json')
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        grid.innerHTML = '<p class="pl-empty">Todavía no hay playlists en data/spoti.json.</p>';
        return;
      }

      const cards = data.filter(entry => entry && entry.id).map(entry => {
        const card = buildCard(entry);
        grid.appendChild(card);
        return card;
      });

      if (!('IntersectionObserver' in window)) {
        cards.forEach(hydrate);
        return;
      }

      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          hydrate(e.target);
        });
      }, { rootMargin: '300px 0px' });

      cards.forEach(card => io.observe(card));
    })
    .catch(err => {
      console.error('Error cargando playlists:', err);
      grid.innerHTML = '<p class="pl-empty">No se ha podido cargar data/spoti.json.</p>';
    });
})();
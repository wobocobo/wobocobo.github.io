const IMAGE_PROXY = 'https://images.weserv.nl/?url=';

function posterUrl(src, width) {
  if (!src) return '';
  if (!/^https?:\/\//i.test(src)) return src;
  const bare = src.replace(/^https?:\/\//i, '');
  if (!/^pics\.filmaffinity\.com\//i.test(bare)) return src;
  return IMAGE_PROXY + bare + '&w=' + width + '&q=80&output=jpg';
}

function posterImg(src, width, alt) {
  if (!src) return '';
  return `<img src="${posterUrl(src, width)}" alt="${alt}" loading="lazy" decoding="async" data-fallback="${src}">`;
}

document.addEventListener('error', e => {
  const img = e.target;
  if (!img || img.tagName !== 'IMG' || !img.dataset.fallback || img.dataset.fallbackUsed) return;
  img.dataset.fallbackUsed = '1';
  img.src = img.dataset.fallback;
}, true);

const intro = { avg: 0 };

function renderIntro() {
  if (intro.avg <= 0) return;
  const label = intro.avg.toFixed(1).replace('.', ',');

  const value = document.querySelector('[data-cine-stat="avg"]');
  if (value) value.textContent = label;

  const ring = document.querySelector('[data-cine-ring]');
  if (!ring) return;
  ring.setAttribute('aria-label', `Nota media ${label} sobre 10`);

  const fill = ring.querySelector('.circle-fill');
  if (!fill) return;
  const pct = Math.min(100, Math.max(0, (intro.avg / 10) * 100));
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { fill.style.strokeDashoffset = 100 - pct; });
  });
}

fetch('data/ratings.json')
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById('movies');

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="text-faint">Todavía no hay valoraciones exportadas. Usa el marcador de exportar-cine.html y actualiza data/ratings.json.</p>';
      return;
    }

    const scores = data.map(r => Number(r.rating)).filter(n => !Number.isNaN(n) && n > 0);
    if (scores.length) {
      intro.avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
    renderIntro();

    data.slice(0, 12).forEach(movie => {
      const card = document.createElement('a');
      card.className = 'movie-card';
      card.href = movie.url;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.setAttribute('aria-label', movie.title + ' en FilmAffinity');

      const year = movie.year ? ` (${movie.year})` : '';
      const rate = movie.rating ? `<span><i aria-hidden="true">★</i> ${movie.rating}/10</span>` : '';

      card.innerHTML = `
        ${movie.poster ? posterImg(movie.poster, 400, movie.title) : ''}
        <div class="movie-info">
          <h4>${movie.title}${year}</h4>
          ${rate}
        </div>
      `;
      container.appendChild(card);
    });
  })
  .catch(err => {
    console.error('Error cargando películas:', err);
    const container = document.getElementById('movies');
    if (container) {
      container.innerHTML = '<p class="text-faint">No se ha podido cargar data/ratings.json.</p>';
    }
  });

fetch('data/lists.json')
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById('lists');

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="text-faint">Todavía no hay listas exportadas.</p>';
      return;
    }

    data.forEach(list => {
      const card = document.createElement('a');
      card.className = 'list-card';
      card.href = list.url;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.setAttribute('aria-label', list.name + ' en FilmAffinity');

      const posters = (list.posters || [])
        .map(p => posterImg(p, 300, ''))
        .join('');

      card.innerHTML = `
        ${posters ? `<div class="list-card__posters">${posters}</div>` : ''}
        <div class="list-card__info">
          <h4>${list.name}</h4>
          <span class="count">${list.count} títulos</span>
          ${list.description ? `<p class="desc">${list.description}</p>` : ''}
        </div>
      `;
      container.appendChild(card);
    });
  })
  .catch(err => {
    console.error('Error cargando listas:', err);
    const container = document.getElementById('lists');
    if (container) {
      container.innerHTML = '<p class="text-faint">No se ha podido cargar data/lists.json.</p>';
    }
  });
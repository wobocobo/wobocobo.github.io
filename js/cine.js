fetch('data/ratings.json')
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById('movies');

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="text-faint">Todavía no hay valoraciones exportadas. Usa el marcador de exportar-cine.html y actualiza data/ratings.json.</p>';
      return;
    }

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
        ${movie.poster ? `<img src="${movie.poster}" alt="${movie.title}" loading="lazy">` : ''}
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
        .map(p => `<img src="${p}" alt="" loading="lazy">`)
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
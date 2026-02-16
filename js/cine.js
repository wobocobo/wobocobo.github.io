fetch('data/ratings.json')
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById('movies');

    data.slice(0, 12).forEach(movie => {
      container.innerHTML += `
        <div class="movie-card">
          <img src="${movie.poster}" alt="${movie.title}">
          <div class="movie-info">
            <h4>${movie.title} (${movie.year})</h4>
            <span>⭐ ${movie.rating}</span>
          </div>
        </div>
      `;
    });
  })
  .catch(err => {
    console.error('Error cargando películas:', err);
  });
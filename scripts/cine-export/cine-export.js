/* Marcador para exportar tus votos de FilmAffinity a data/ratings.json.
   Se pulsa en tu perfil de votaciones: pide todas las páginas en vista lista
   desde tu propio navegador (Cloudflare bloquea las peticiones desde
   servidores), una por segundo, y después las mismas filtradas por cada
   género (la vista lista no lo trae). Descarga el JSON con una película por
   línea, el mismo formato que usa la web. El href del marcador en
   exportar-cine.html es el base64 de este archivo: si lo cambias, regenéralo. */
(async function () {
  if (!/filmaffinity\.com$/.test(location.hostname) || !/userratings\.php/.test(location.pathname)) {
    alert('Abre tu perfil de votaciones en FilmAffinity y pulsa el marcador allí.');
    return;
  }
  var userId = new URLSearchParams(location.search).get('user_id');
  if (!userId) {
    alert('No encuentro tu user_id en la dirección de la página.');
    return;
  }

  var MONTHS = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
  };

  function text(el) {
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  }
  /* «22.681» → 22681 y «5,7» → 5.7 */
  function num(s) {
    return s ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : null;
  }
  /* «votada 23 de octubre de 2026» → «2026-10-23» */
  function iso(s) {
    var m = s.match(/(\d+) de (\w+) de (\d{4})/);
    if (!m) return '';
    return m[3] + '-' + String(MONTHS[m[2].toLowerCase()]).padStart(2, '0') + '-' + m[1].padStart(2, '0');
  }
  function poster(row) {
    var img = row.querySelector('.mc-poster img, img');
    var s = img ? (img.getAttribute('data-srcset') || img.getAttribute('srcset') || img.getAttribute('src') || '') : '';
    var m = s.match(/https:\/\/pics\.filmaffinity\.com\/[^\s,]+-large\.jpg/) || s.match(/https:\/\/pics\.filmaffinity\.com\/[^\s,]+/);
    return m ? m[0] : '';
  }

  /* Cada grupo es un día de votos («votada …») con sus películas */
  function parse(doc) {
    var out = [];
    doc.querySelectorAll('.fa-content-card').forEach(function (group) {
      var date = iso(text(group.querySelector('.card-header')));
      group.querySelectorAll('.row.mb-4').forEach(function (row) {
        var card = row.querySelector('.movie-card');
        var a = row.querySelector('.mc-title a');
        if (!card || !a) return;
        var credits = Array.prototype.map.call(row.querySelectorAll('.credits'), function (c) {
          return Array.prototype.map.call(c.querySelectorAll('a'), function (x) { return x.textContent.trim(); });
        });
        var flag = row.querySelector('.nflag');
        out.push({
          id: card.getAttribute('data-movie-id'),
          title: text(a),
          year: parseInt(text(row.querySelector('.mc-year')), 10) || null,
          rating: parseInt(text(row.querySelector('.fa-user-rat-box')), 10) || null,
          avg: num(text(row.querySelector('.fa-avg-rat-box .avg'))),
          votes: num(text(row.querySelector('.fa-avg-rat-box .count'))),
          country: flag ? flag.getAttribute('alt') || '' : '',
          directors: credits[0] || [],
          cast: (credits[1] || []).slice(0, 3),
          poster: poster(row),
          ratedAt: date
        });
      });
    });
    return out;
  }

  var box = document.createElement('div');
  box.style.cssText = 'position:fixed;z-index:999999;top:16px;left:50%;transform:translateX(-50%);' +
    'background:#111a30;color:#f2f6fc;border:1px solid #33456e;border-radius:10px;padding:12px 18px;' +
    'font:600 14px/1.4 Inter,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35);';
  document.body.appendChild(box);

  var base = 'https://www.filmaffinity.com/es/userratings.php?user_id=' + encodeURIComponent(userId) +
    '&orderby=rating-date&chv=list';
  function wait(ms) {
    return new Promise(function (ok) { setTimeout(ok, ms || 1200); });
  }
  /* Pasada la última página FilmAffinity responde 404. Si pide calma (429,
     «Demasiadas peticiones») se espera y se reintenta; con cualquier otro
     fallo se aborta, para no descargar los datos a medias. */
  async function page(url) {
    for (var tries = 1; tries <= 4; tries++) {
      var res = await fetch(url, { credentials: 'include' });
      if (res.ok) return parse(new DOMParser().parseFromString(await res.text(), 'text/html'));
      if (res.status === 404) return [];
      if (res.status !== 429 || tries === 4) break;
      box.textContent = 'FilmAffinity pide calma: espero ' + (20 * tries) + ' segundos…';
      await wait(20000 * tries);
    }
    throw new Error('FilmAffinity ha respondido ' + res.status);
  }

  try {
    var all = [];
    var seen = {};
    for (var p = 1; p <= 100; p++) {
      box.textContent = 'Leyendo la página ' + p + '… (' + all.length + ' votos)';
      var rows = await page(base + '&p=' + p);
      if (!rows.length) break;
      rows.forEach(function (r) {
        if (!seen[r.id]) {
          seen[r.id] = 1;
          all.push(r);
        }
      });
      await wait();
    }

    if (!all.length) {
      box.remove();
      alert('No he encontrado ningún voto en tu perfil.');
      return;
    }

    /* Géneros: los del desplegable de filtros de la propia página, en su orden.
       Una película puede tener varios. */
    var genreSelect = document.querySelector('select[name="filter-genre"]');
    var genres = genreSelect ? Array.prototype.map.call(genreSelect.options, function (o) {
      return [o.value, o.textContent.trim()];
    }) : [];
    var genresOf = {};
    for (var g = 0; g < genres.length; g++) {
      for (var gp = 1; gp <= 100; gp++) {
        box.textContent = 'Géneros: ' + genres[g][1] + ' (' + (g + 1) + ' de ' + genres.length + ')…';
        var tagged = await page(base + '&filterby=genre:' + encodeURIComponent(genres[g][0]) + '&p=' + gp);
        tagged.forEach(function (r) {
          var list = (genresOf[r.id] = genresOf[r.id] || []);
          if (list.indexOf(genres[g][1]) === -1) list.push(genres[g][1]);
        });
        await wait();
        if (tagged.length < 50) break;
      }
    }
  } catch (err) {
    box.remove();
    alert('No se ha podido terminar la exportación (' + err.message + '). Vuelve a intentarlo en unos minutos.');
    return;
  }
  box.remove();

  /* Mismo orden de campos que data/ratings.json, con los géneros tras el país */
  var json = '[\n' + all.map(function (r) {
    return '  ' + JSON.stringify({
      id: r.id, title: r.title, year: r.year, rating: r.rating, avg: r.avg, votes: r.votes,
      country: r.country, genres: genresOf[r.id] || [], directors: r.directors, cast: r.cast,
      poster: r.poster, ratedAt: r.ratedAt
    });
  }).join(',\n') + '\n]\n';
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = 'ratings.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  alert('Exportados ' + all.length + ' votos. Sustituye data/ratings.json por el archivo descargado.');
})();

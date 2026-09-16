(function () {
  if (!/filmaffinity\.com/.test(location.hostname)) {
    alert('Abre tu perfil de votaciones en FilmAffinity (vista lista) y pulsa el marcador alli.');
    return;
  }

  var KEY = '__wobocobo_cine_ratings';
  var acc;
  try { acc = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) { acc = []; }
  if (!Array.isArray(acc)) acc = [];

  var seen = {};
  acc.forEach(function (r) { if (r && r.id) seen[r.id] = 1; });

  function posterUrl(row) {
    var img = row.querySelector('.poster-col img');
    var srcset = img ? (img.getAttribute('data-srcset') || img.getAttribute('src') || '') : '';
    var m = srcset.match(/https:\/\/pics\.filmaffinity\.com\/[^\s,]+-large\.jpg/);
    if (m) return m[0];
    m = srcset.match(/https:\/\/pics\.filmaffinity\.com\/[^\s,]+/);
    return m ? m[0] : '';
  }

  var added = 0;
  var groups = document.querySelectorAll('.fa-content-card');
  groups.forEach(function (group) {
    var header = group.querySelector('.card-header');
    var date = header ? header.textContent.replace(/^votada\s*/, '').trim() : '';
    group.querySelectorAll('.row.mb-4').forEach(function (row) {
      var card = row.querySelector('.movie-card');
      var anchor = row.querySelector('.mc-title a');
      if (!anchor || !card) return;
      var id = card.getAttribute('data-movie-id');
      if (!id || seen[id]) return;
      var ratingEl = row.querySelector('.fa-user-rat-box');
      seen[id] = 1;
      acc.push({
        id: id,
        title: anchor.textContent.trim(),
        year: (function (n) { return n ? n.textContent.trim() : ''; })(row.querySelector('.mc-year')),
        rating: ratingEl ? ratingEl.textContent.trim() : '',
        poster: posterUrl(row),
        url: anchor.href,
        ratedAt: date
      });
      added++;
    });
  });

  sessionStorage.setItem(KEY, JSON.stringify(acc));

  var cur = 1;
  var curM = location.search.match(/[?&]p=(\d+)/);
  if (curM) cur = parseInt(curM[1], 10);

  var links = Array.prototype.slice.call(document.querySelectorAll('.pager-bs .pagination a.page-link'));
  var next = null;
  links.some(function (a) {
    var m = (a.getAttribute('href') || '').match(/[?&]p=(\d+)/);
    if (m && parseInt(m[1], 10) === cur + 1) { next = a.href; return true; }
    return false;
  });
  if (!next) {
    var rel = links.filter(function (a) { return a.getAttribute('rel') === 'next'; })[0];
    if (rel) next = rel.href;
  }

  if (next) {
    showOverlay('Pagina ' + cur + ' extraida (' + added + ' nuevas). Yendo a la siguiente...');
    setTimeout(function () { location.href = next; }, 900);
    return;
  }

  var blob = new Blob([JSON.stringify(acc, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'wobocobo-cine-ratings.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  sessionStorage.removeItem(KEY);
  alert('Exportadas ' + acc.length + ' valoraciones. Guarda el JSON en data/ratings.json');

  function showOverlay(msg) {
    var el = document.createElement('div');
    el.id = 'wobocobo-export-notice';
    el.textContent = msg;
    el.style.cssText = 'position:fixed;z-index:999999;top:16px;left:50%;transform:translateX(-50%);' +
      'background:#111a30;color:#f2f6fc;border:1px solid #33456e;border-radius:10px;padding:12px 18px;' +
      'font:600 14px/1.4 Inter,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35);';
    document.body.appendChild(el);
  }
})();
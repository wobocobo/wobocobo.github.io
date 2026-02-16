const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const URL = 'https://www.filmaffinity.com/es/userratings.php?user_id=9048877&p=1&orderby=rating-date&chv=grid';

async function scrape() {
  const { data } = await axios.get(URL, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  const $ = cheerio.load(data);
  const movies = [];

  $('.movie-card').each((i, el) => {
    const title = $(el).find('.mc-title a').text().trim();
    const year = $(el).find('.mc-title span').text().trim();
    const rating = $(el).find('.ur-mr-rat').text().trim();
    const poster = $(el).find('img').attr('src');

    if (title) {
      movies.push({ title, year, rating, poster });
    }
  });

  fs.writeFileSync('./data/ratings.json', JSON.stringify(movies, null, 2));
  console.log('JSON actualizado');
}

scrape();
const request = require('request-promise');
const regularReguest = require('request');
const fs = require('fs');
const cheerio = require('cheerio');
const Nightmare = require("nightmare");
const nightmare = Nightmare({ show: true });

async function scrapeTitlesRandsAndRatings() {
    const result = await request.get('https://www.imdb.com/chart/moviemeter/?ref_=nv_mv_mpm');
    const $ = await cheerio.load(result);
    const movies = $('tr').map((i, el) => {
        const title = $(el).find('td.titleColumn > a').text();
        const imdbRating = $(el).find('td.ratingColumn.imdbRating').text().trim();
        const year = $(el).find('td.titleColumn span.secondaryInfo').text().trim().substring(1, 5);
        const descriptionUrl = 'https://www.imdb.com' + $(el).find('td.titleColumn > a').attr('href');
        return { title, imdbRating, rank: i, year, descriptionUrl };

    }).get();
    //console.log(movies);
    return movies;

}

async function scraperPosters(movies) {
    const moviesWithPosterUrls = await Promise.all(movies.map(async movie => {
        try {
            const html = await request.get(movie.descriptionUrl);
            const $ = await cheerio.load(html);
            movie.posterUrl = 'https://www.imdb.com' + $('div.poster a').attr('href');
            return movie;
        } catch (err) {
            //console.error(err);
        }
    }));
    return moviesWithPosterUrls;
}

async function getPosterImageUrl(movies) {
    for(var i= 0; i < movies.length; i++) {
       try {
        const html = await nightmare
        .goto(movies[i].posterUrl)
        .evaluate(() => document.body.innerHTML );
        const $ = await cheerio.load(html);
        const imageUrl = $("main > div.ipc-page-content-container > div.media-viewer > div:nth-child(4) > img").attr("src")
            
        movies[i].posterImageUrl = imageUrl;
        savePosterImageToDisk(movies[i]);
        //console.log(movies[i]);
        } catch (error) {
            console.log(error);
       }
    }
    return movies;
}

async function savePosterImageToDisk(movie) {
    regularReguest.get(movie.posterImageUrl).pipe(fs.createWriteStream(`posters/${movie.rank}.png`));
}
async function main() {
    let movies = await scrapeTitlesRandsAndRatings();
    movies = await scraperPosters(movies);
    movies = await getPosterImageUrl(movies);
    //console.log(movies[1]);
}
main();
const cheerio = require('cheerio');
const fs = require('fs');

// v1 of this project is just to list the tournaments in a simple frontend. a nice side project idea would be to ultimately
// build the full-fledged database of players as well and have an API surrounding it. even cooler would be to implement
// the ratings pass algorithm and process results from an omnipong URL, bypassing the need for scraping simplycompete.
// what i do wonder though, is how would we ultimately reconcile diverging information, should this arise? (tbd)

const star = '☆';
const resultsNotProcessed = 'Results not processed yet';

/* 
 * converts newline-separated star characters, for example
 * ☆
 * ☆
 * and returns a number indicating the star rating of the tournament
 * this number is what will be stored in the SQL table. 
 * for some reason SC uses one span tag per star character when the HTML is rendered
*/
function convertStarsToNum(spanContent) {
	let numStars = 0;

	for (let i = 0; i < spanContent.length; ++i) {
		if (spanContent.charAt(i) === star) {
			numStars++;
		}
	}

	return numStars;
}; //works!

/*
 * takes a date, which can be in the format 
 * 01/30/2016 -
 * 01/31/2016
 * and gets rid of the newline and spaces around the '-' character
*/
function sanitizeEventDates(dateContent) {
	if (dateContent.includes('-')) {
		dateContent = dateContent.replace(/\n/g, '');//get rid of newlines
		dateContent = dateContent.replace(/ /g, '');//get rid of spaces in between dates
	}
	return dateContent;
};//works!

/* 
 * the main function in this file, which reads in an html file
 * (the raw html source of the tournaments webpage)
 * and does the scraping/parsing into a .csv file.
 * later, this should be updated to take in source and destination filenames
 * (using process.argv or whatever), and continuing to use the default filenames
 * of source.html and data.csv if no args are provided.
*/
function scrapeToCSV() {
		let data = '';
		
		try {
			data = fs.readFileSync('./source.html', 'utf8');
		} catch(e) {
			console.log('Error:', e.stack);
		}

		// pass the HTML document into cheerio so we can parse it
		const $ = cheerio.load(data); // returns a cheerio object

		let  output = '';

		const header = $('th.sortable');
		
		// even when the selector matches multiple elements, cheerio returns a single object, 
		// when we want to iterate over each matching thing then we need to do something like this
		// involving .each() and this
		header.each(function(i, elem) {
			output += $(this).text().trim() + ',';
		});

		output = output.substring(0, output.length-1); //remove trailing comma
		output += '\n';

		const rows = $('tr.list-item');
		rows.each(function(i, elem) {
			const cellsInRow = $(this).children('td.list-column');
			cellsInRow.each(function(i, elem) {
				if (i===0) {//wrap tournament name in double quotes, and be sure to escape any double quotes which might be part of the tournament name already
					output += '"' + $(this).text().trim().replace(/\"/g, "\"\"") + '"' + ',';
				}else if (i===1) {//star rating conversion (☆☆☆) to 3, gets rid of newlines
					output += convertStarsToNum($(this).text().trim()) + ',';
				} else if (i===3) {//date conversion, get rid of newlines and spaces
					output += sanitizeEventDates($(this).text().trim()) + ',';
				} else {
					output += $(this).text().trim() + ',';
				}
			});

			output = output.substring(0, output.length-1); //remove trailing comma
			output += '\n';
		});

		fs.writeFileSync('./data.csv', output);
} // end func scrapeToCSV

exports.scrapeToCSV = scrapeToCSV;


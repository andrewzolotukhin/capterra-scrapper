const readline = require('readline');
const ProgressBar = require('progress');
const request = require('request-promise');
const cheerio = require('cheerio');
const args = require('args');
const capterraUrl = 'https://www.capterra.com'



const lines = [];

const sleep = ms => {
	return new Promise(r => {
		setTimeout(r, ms);
	});
}

const downloadCompaniesAndProducts = async categories => {
	const bar = new ProgressBar(` downloading companies from ${categories.length} categories [:bar] :rate/cps :percent :etas`, {
		complete: '=',
		incomplete: ' ',
		width: 80,
		total: categories.length
	});
	const companies = {};
	const addProduct = (name, url, company, category) => {
		if (!companies[company]) companies[company] = {
			products: []
		};
		if (companies[company].products.filter(p => p.name === name).length === 0) {
			companies[company].products.push({
				name,
				url,
				count: 1,
				categories: [category]
			})
		} else {
			const product = companies[company].products.find(p => p.name === name);
			product.count++;
			if (product.categories.indexOf(category) === -1) {
				product.categories.push(category);
			}
		}
	};

	for (let i = 0; i < categories.length; i++) {
		try {
			const html = await request(`${capterraUrl}/${categories[i]}/`);
			const $ = cheerio.load(html);
			$('.card.listing').each((j, listing) => {
				const product = {};
				product.url = $(listing).find('.listing-description .spotlight-link').attr('href');
				product.name = $(listing).find('h2').text().trim();
				company = $(listing).find('h3.listing-vendor').text().replace(/^by /, '').trim().toLowerCase();
				addProduct(product.name, product.url, company, categories[i]);
			});
			await sleep(100);
		} catch (e) {
			console.error(e);
		} finally {
			bar.tick(1);
		}
	}
	return companies;
};

const readInput = () => {
	return new Promise(r => {
		const rl = readline.createInterface({
			input: process.stdin
		});

		rl.on('line', line => {
			if (!line.startsWith('#')) {
				lines.push(line);
			}
		});

		rl.on('close', () => {
			r(lines);
		});
	});
}

getCompanies = (name, sub, options) => {
	readInput().then(categories => {
		downloadCompaniesAndProducts(categories).then(companies => console.log(JSON.stringify(companies, null, 3)));
	});
}

args.command('companies', 'Load companies and their products, reading categories list from STDIN', getCompanies);
const flags = args.parse(process.argv);
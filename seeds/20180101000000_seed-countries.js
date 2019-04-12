const config = require('config');
const fs = require('fs-extra');
const { join } = require('path');

const sourceDataDir =
  process.env.SOURCE_DATA_DIR ||
  join(__dirname, '..', config.get('sourceDataDir'));

// The country codes file was obtained here:
// https://github.com/lukes/ISO-3166-Countries-with-Regional-Codes
const countriesPath = join(sourceDataDir, 'countries.json');

exports.seed = async function (knex) {
  let countries = await fs.readJSON(countriesPath);

  // Format ids
  countries = countries.map(c => {
    return {
      id: c['alpha-2'],
      name: c['name']
    };
  });

  // Deletes ALL existing entries
  return knex('countries')
    .del()
    .then(function () {
      // Inserts seed entries
      return knex('countries').insert(countries);
    });
};

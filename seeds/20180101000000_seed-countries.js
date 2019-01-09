const config = require('config');
const { readFileSync } = require('fs');
const { join } = require('path');
const { load } = require('js-yaml');

const sourceDataDir = process.env.SOURCE_DATA_DIR || join(__dirname, '..', config.get('sourceDataDir'));
const countriesPath = join(sourceDataDir, 'countries.yml');

exports.seed = function (knex) {
  const countriesYaml = readFileSync(countriesPath, 'utf-8');
  const countries = load(countriesYaml).countries;
  // Deletes ALL existing entries
  return knex('countries')
    .del()
    .then(function () {
      // Inserts seed entries
      return knex('countries').insert(countries);
    });
};

const { readFileSync } = require('fs');
const { join } = require('path');
const { load } = require('js-yaml');

const countriesPath = join(__dirname, 'fixtures', 'countries.yml');

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

const { readFileSync } = require('fs');
const { join } = require('path');
const { load } = require('js-yaml');

exports.seed = function (knex) {
  const countriesPath = join(__dirname, '..', 'samples', 'countries.yml');
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

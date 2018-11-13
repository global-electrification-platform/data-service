const { readdirSync } = require('fs');
const { join } = require('path');
const csv = require('fast-csv');

const scenariosDirPath = join(__dirname, '..', 'samples', 'scenarios');

async function readScenariosFile (knex, scenarioFileName) {
  const [scenarioId] = scenarioFileName.split('.');
  const scenarioFilePath = join(scenariosDirPath, scenarioFileName);

  return new Promise(function (resolve, reject) {
    const entries = [];

    csv
      .fromPath(scenarioFilePath, { headers: true })
      .on('data', results => {
        // Convert columns to object properties
        const entry = {
          scenario_id: scenarioId,
          area_id: results.area_id
        };
        delete results.area_id;
        entry.results = results;
        entries.push(entry);
      })
      .on('end', async () => {
        // Insert to the database
        await knex('scenarios')
          .insert(entries)
          .then(resolve);
      })
      .on('error', reject);
  });
}

exports.seed = async function (knex, Promise) {
  await knex('scenarios').del();
  const scenarioFiles = readdirSync(scenariosDirPath);
  return Promise.all(scenarioFiles.map(file => readScenariosFile(knex, file)));
};

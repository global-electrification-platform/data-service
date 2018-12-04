const { readdirSync } = require('fs');
const { join } = require('path');
const csv = require('fast-csv');

const scenariosDirPath = join(__dirname, 'fixtures', 'scenarios');

async function readScenariosFile (knex, scenarioFileName) {
  const [scenarioId] = scenarioFileName.split('.');
  const scenarioFilePath = join(scenariosDirPath, scenarioFileName);

  // Technologies, by index, on mw-1 scenarios
  const techs = [
    'grid',
    'sa-diesel',
    'sa-pv',
    'mg-diesel',
    'mg-pv',
    'mg-wind',
    'mg-hydro'
  ];

  return new Promise(function (resolve, reject) {
    const entries = [];

    csv
      .fromPath(scenarioFilePath, { headers: true, delimiter: ';' })
      .on('data', results => {
        // Convert columns to object properties
        const entry = {
          scenarioId: scenarioId,
          areaId: results.ID,
          electrificationTech: techs[results.FinalElecCode2030],
          investmentCost: parseFloat(results.InvestmentCost2030),
          newCapacity: parseFloat(results.NewCapacity2030),
          electrifiedPopulation: parseFloat(results.Pop)
        };
        delete results.ID;
        delete results.FinalElecCode2030;
        delete results.InvestmentCost2030;
        delete results.NewCapacity2030;
        delete results.Pop;
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

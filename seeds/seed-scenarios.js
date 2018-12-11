const { readFile, readdir } = require('fs-extra');
const { join } = require('path');
const csv = require('fast-csv');
const yaml = require('js-yaml');
const path = require('path');

const scenariosPath = join(__dirname, 'fixtures', 'scenarios');
const modelsPath = join(__dirname, 'fixtures', 'models');

exports.seed = async function (knex, Promise) {
  function getModelId (scenarioId) {
    return scenarioId.substring(0, scenarioId.lastIndexOf('-'));
  }

  async function loadModelFromFile (modelId) {
    const modelYaml = await readFile(
      path.join(modelsPath, `${modelId}.yml`),
      'utf-8'
    );
    return yaml.load(modelYaml);
  }

  async function getFilters (scenarioId) {
    const modelId = getModelId(scenarioId);
    const model = await loadModelFromFile(modelId);
    return model.filters.map(filter => {
      return { key: filter.key, type: filter.type };
    });
  }

  async function readScenariosFile (scenarioFileName) {
    const [scenarioId] = scenarioFileName.split('.');
    const scenarioFilePath = join(scenariosPath, scenarioFileName);

    const filters = await getFilters(scenarioId);

    // Read CSV File
    return new Promise(function (resolve, reject) {
      const entries = [];

      csv
        .fromPath(scenarioFilePath, { headers: true, delimiter: ';' })
        .on('data', record => {
          // Convert columns to object properties
          const entry = {
            scenarioId: scenarioId,
            featureId: parseInt(record.ID),
            electrificationTech: record.FinalElecCode2030,
            investmentCost: parseFloat(record.InvestmentCost2030),
            newCapacity: parseFloat(record.NewCapacity2030),
            electrifiedPopulation: parseFloat(record.Pop),
            filterValues: {}
          };

          // Ingest values to be filtered
          for (const filter of filters) {
            entry.filterValues[filter.key] = record[filter.key];

            // Convert to number if filter is type of range
            if (filter.type === 'range') {
              entry.filterValues[filter.key] = parseFloat(
                entry.filterValues[filter.key]
              );
            }
          }

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

  await knex('scenarios').del();
  const scenarioFiles = await readdir(scenariosPath);
  return Promise.all(scenarioFiles.map(file => readScenariosFile(file)));
};

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
    const model = await getModel(scenarioId);
    return model.filters.map(filter => {
      return { key: filter.key, type: filter.type, timestep: filter.timestep };
    });
  }

  async function getModel (scenarioId) {
    const modelId = getModelId(scenarioId);
    return loadModelFromFile(modelId);
  }

  async function readScenariosFile (scenarioFileName) {
    const [scenarioId] = scenarioFileName.split('.');

    console.time(`Scenario ${scenarioId} imported in`);  // eslint-disable-line

    const scenarioFilePath = join(scenariosPath, scenarioFileName);

    const filters = await getFilters(scenarioId);
    const model = await getModel(scenarioId);
    const modelId = getModelId(scenarioId);

    const timesteps = model.timesteps || [];

    const getFilterValueFromRecord = (record, filter, key) => {
      if (filter.type === 'range') {
        return parseFloat(record[key]);
      } else {
        return record[key];
      }
    };

    // Read CSV File
    return new Promise(function (resolve, reject) {
      const records = [];
      csv
        .fromPath(scenarioFilePath, { headers: true, delimiter: ',' })
        .on('data', record => {
          if (record.ID.indexOf('-') > -1) {
            record.ID = record.ID.split('-')[1];
          }

          // Filter values to get depend on the model's timesteps, if available.
          let errors = [];
          const filtersWithTimestepKeys = filters.reduce((acc, filter) => {
            if (filter.timestep && timesteps.length) {
              return acc.concat(timesteps.map(t => {
                const k = filter.key + t;
                if (!record[k]) {
                  errors.push(`Timestep filter key [${k}] for filter [${filter.key}] of model [${modelId}] not found in scenario [${scenarioId}]`);
                }
                return {
                  ...filter,
                  key: k,
                  _key: filter.key
                };
              }));
            } else {
              if (!record[filter.key]) {
                errors.push(`Filter key [${filter.key}] of model [${modelId}] not found in scenario [${scenarioId}]`);
              }
              return acc.concat(filter);
            }
          }, []);

          // Calc summary value based on timesteps.
          const summaryKeys = [
            { key: 'FinalElecCode', parser: parseInt },
            { key: 'InvestmentCost', parser: parseFloat },
            { key: 'NewCapacity', parser: parseFloat },
            { key: 'Pop', parser: parseFloat }
          ];

          const summaryWithTimestepKeys = summaryKeys.reduce((acc, summ) => {
            if (timesteps.length) {
              return acc.concat(timesteps.map(t => {
                const k = summ.key + t;
                if (!record[k]) {
                  errors.push(`Summary key [${k}] of model [${modelId}] not found in scenario [${scenarioId}]`);
                }
                return {
                  ...summ,
                  key: k,
                  _key: summ.key
                };
              }));
            } else {
              if (!record[summ.key]) {
                errors.push(`Summary key [${summ.key}] of model [${modelId}] not found in scenario [${scenarioId}]`);
              }
              return acc.concat(summ);
            }
          }, []);

          if (errors.length) {
            console.log(errors.join('\n'));  // eslint-disable-line
            console.log('');  // eslint-disable-line
            console.log('Seed process failed!');  // eslint-disable-line
            process.exit(1);
          }

          // Prepare data for database.
          const entry = {
            modelId: modelId,
            scenarioId: scenarioId,
            featureId: parseInt(record.ID),
            summary: {},
            filterValues: {}
          };

          // Add summary.
          for (const { key, parser } of summaryWithTimestepKeys) {
            entry.summary[key] = parser(record[key]);
          }

          // Add filters.
          for (const filter of filtersWithTimestepKeys) {
            entry.filterValues[filter.key] = getFilterValueFromRecord(record, filter, filter.key);
          }

          records.push(entry);
        })
        .on('end', async () => {
          try {
            await knex.batchInsert('scenarios', records);
            console.timeEnd(`Scenario ${scenarioId} imported in`); // eslint-disable-line
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  // Clean scenarios table
  await knex('scenarios').del();

  // Get file names
  let scenarioFiles = await readdir(scenariosPath);

  // Ignore non-csv files
  scenarioFiles = scenarioFiles.filter(f => f.endsWith('.csv'));

  // Import files in series
  for (const file of scenarioFiles) {
    await readScenariosFile(file);
  }
};

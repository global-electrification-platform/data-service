const config = require('config');
const { readFile, readdir } = require('fs-extra');
const { join } = require('path');
const csv = require('fast-csv');
const yaml = require('js-yaml');
const path = require('path');

const sourceDataDir =
  process.env.SOURCE_DATA_DIR ||
  join(__dirname, '..', config.get('sourceDataDir'));
const modelsDir = join(sourceDataDir, 'models');
const scenariosDir = join(sourceDataDir, 'scenarios');

exports.seed = async function (knex, Promise) {
  function getModelId (scenarioId) {
    return scenarioId.substring(0, scenarioId.lastIndexOf('-'));
  }

  async function loadModelFromFile (modelId) {
    const modelYaml = await readFile(
      path.join(modelsDir, `${modelId}.yml`),
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

    console.time(`Scenario ${scenarioId} imported in`); // eslint-disable-line

    const scenarioFilePath = join(scenariosDir, scenarioFileName);

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

    // Filter values to get depend on the model's timesteps, if available.
    const filtersWithTimestepKeys = filters.reduce((acc, filter) => {
      if (filter.timestep && timesteps.length) {
        return acc.concat(
          timesteps.map(year => ({
            ...filter,
            key: filter.key + year,
            _key: filter.key
          }))
        );
      } else {
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
        return acc.concat(
          timesteps.map(t => ({
            ...summ,
            key: summ.key + t,
            _key: summ.key
          }))
        );
      } else {
        return acc.concat(summ);
      }
    }, []);

    // Read CSV File
    return new Promise(function (resolve, reject) {
      const records = [];
      csv
        .fromPath(scenarioFilePath, { headers: true, delimiter: ',' })
        .on('data', record => {
          if (record.ID.indexOf('-') > -1) {
            record.ID = record.ID.split('-')[1];
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
            entry.filterValues[filter.key] = getFilterValueFromRecord(
              record,
              filter,
              filter.key
            );
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
  let scenarioFiles = await readdir(scenariosDir);

  // Ignore non-csv files
  scenarioFiles = scenarioFiles.filter(f => f.endsWith('.csv'));

  // Import files in series
  for (const file of scenarioFiles) {
    await readScenariosFile(file);
  }
};

const { readFile, readdir } = require('fs-extra');
const yaml = require('js-yaml');
const path = require('path');

const { prepareScenarioRecords } = require('../cli/scenarios');
const { prepareModelRecord } = require('../cli/models');

exports.seed = async function (knex, Promise) {
  const dirList = await readdir(path.join(__dirname, '../fixtures'));
  const modelFolders = dirList.filter(f => f.match(/[a-z]+-[0-9]/));

  // Clean scenarios table
  await knex('scenarios').del();

  // Clean models table
  await knex('models').del();

  for (const folder of modelFolders) {
    const files = await readdir(path.join(__dirname, '../fixtures', folder));
    const modelFile = files.find(f => f.endsWith('.yml'));
    const scenariosFiles = files.filter(f => f.endsWith('.csv'));

    const modelPath = path.join(__dirname, '../fixtures', folder, modelFile);
    const yamlModel = await readFile(modelPath, 'utf-8');
    const model = yaml.load(yamlModel);

    for (const scenarioFile of scenariosFiles) {
      const scenarioPath = path.join(__dirname, '../fixtures', folder, scenarioFile);
      const records = await prepareScenarioRecords(model, scenarioPath);
      await knex.batchInsert('scenarios', records);
    }

    const modelRecord = await prepareModelRecord(knex, model);
    await knex('models').insert(modelRecord);
  }
};

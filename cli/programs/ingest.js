const _ = require('lodash');
const path = require('path');

const db = require('../../app/db');
const { print, time, userError, validateDirPath } = require('../utils');
const {
  validateModel,
  getModelFromDir,
  validateModelDiff,
  prepareModelRecord
} = require('../models');
const {
  getModelScenariosFromDir,
  validateModelScenario,
  prepareScenarioRecords
} = require('../scenarios');

/**
 * Commander program
 *
 * Usage: ingest [options] <path>
 *
 * Ingests a model and its data
 *
 * Options:
 *   --config-only  Updates the non-data parts of the model configuration
 *   --override     Removes data from the database and imports again
 *   -h, --help     output usage information
 */
module.exports = async (dirPath, command) => {
  await validateDirPath(dirPath);

  dirPath = path.join(process.env.INIT_CWD, dirPath);
  if (command.configOnly && command.override) {
    throw userError([
      'The --config-only and --override options can not be used together.',
      ''
    ]);
  }

  const validateCmdExpr = `node ${path.resolve(
    __dirname,
    '../index.js'
  )} validate ${dirPath}`;

  const modelPath = await getModelFromDir(dirPath);
  let model;
  try {
    model = await validateModel(modelPath);
  } catch (error) {
    if (!error.userError) throw error;
    throw userError([
      'Model is not valid. Run the following command to validate data beforehand',
      `    ${validateCmdExpr}`,
      '',
      'Ingest failed',
      ''
    ]);
  }

  const dbModel = await db('models')
    .select('*')
    .where('id', model.id)
    .first();

  // Config only flag. Update the model.
  if (command.configOnly) {
    if (!dbModel) {
      throw userError([
        'No model found to update',
        'If this is the first ingest, remove the  --config-only flag'
      ]);
    }

    // Throws error if something is not correct.
    validateModelDiff(dbModel, model);

    // All good. Update model.
    const newModel = _.defaultsDeep({}, model, dbModel);

    await db('models')
      .update(newModel)
      .where('id', model.id);

    print('Model updated');
    return;
  }

  if (dbModel && !command.override) {
    throw userError([
      'Model already exists',
      'Use --override if you want to re-import the data',
      ''
    ]);
  }

  const csvs = await getModelScenariosFromDir(dirPath);
  for (const file of csvs) {
    try {
      // Quick validation before importing data.
      await validateModelScenario(model, path.join(dirPath, file));
    } catch (error) {
      if (!error.userError) throw error;
      throw userError([
        'Scenarios not valid. Run the following command to validate data beforehand',
        `    ${validateCmdExpr}`,
        '',
        'Ingest failed',
        ''
      ]);
    }
  }

  // Import data. Start transaction.
  time('import-process');
  await db.transaction(async trx => {
    try {
      print('Importing scenarios for model', model.id);
      print();
      // Import scenarios first as they're needed to compute the model filters.
      await trx('scenarios')
        .where('modelId', model.id)
        .del();

      time('scenariosTime');
      for (const file of csvs) {
        print(file);
        time('fileTime');
        const records = await prepareScenarioRecords(
          model,
          path.join(dirPath, file)
        );
        await trx.batchInsert('scenarios', records);
        print('  Imported in', time('fileTime'));
      }

      print();
      print('Scenarios imported in', time('scenariosTime'));
      print();

      print('Importing model');
      time('modelTime');
      // Cleanup
      await trx('models')
        .where('id', model.id)
        .del();

      const record = await prepareModelRecord(trx, model);
      await trx('models').insert(record);
      print('  Imported in', time('modelTime'));
    } catch (error) {
      print('An error occurred. Changes were rollback.');
      throw error;
    }
  });

  print();
  print('Finished in', time('import-process'));
};

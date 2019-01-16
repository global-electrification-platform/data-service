const path = require('path');

const { print, userError } = require('../utils');
const {
  validateModel,
  getModelFromDir,
  getModelScenariosFromDir,
  validateModelScenario
} = require('../models');

/**
 * Commander program
 *
 * Usage: validate [options] <path>
 *
 * Validates a model and its data
 *
 * Options:
 *   -h, --help  output usage information
 */
module.exports = async dirPath => {
  dirPath = path.join(process.env.INIT_CWD, dirPath);
  const modelPath = await getModelFromDir(dirPath);
  const model = await validateModel(modelPath);

  print('Model is valid!');
  print('Checking model scenarios.');
  print('');

  // Check if there's data to validate.
  const csvs = await getModelScenariosFromDir(dirPath);

  let failed = false;
  for (const file of csvs) {
    try {
      print(file);
      await validateModelScenario(model, path.join(dirPath, file));
      print('  Valid');
    } catch (error) {
      failed = true;
      if (!error.userError) throw error;
      // Capture user error and print details without breaking.
      error.details.forEach(e => {
        print(' ', e);
      });
    }
  }

  if (failed) {
    throw userError(
      ['', 'Model scenarios contain errors. Validation failed.'],
      true
    );
  }

  print('Validation successful');
};

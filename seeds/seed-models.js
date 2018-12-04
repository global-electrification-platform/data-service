const { readFileSync, readdirSync } = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const modelsPath = path.join(__dirname, 'fixtures', 'models');

exports.seed = function (knex) {
  const models = [];
  const modelFilenames = readdirSync(modelsPath);

  // Load models from samples directory
  modelFilenames &&
    modelFilenames.forEach(modelFilename => {
      const yamlModel = readFileSync(path.join(modelsPath, modelFilename), 'utf-8');
      const jsonModel = yaml.load(yamlModel);
      models.push(jsonModel);
    });

  // Perform database tasks
  if (models.length > 0) {
    // Deletes ALL existing entries
    return knex('models')
      .del()
      .then(function () {
        // Inserts seed entries
        return knex('models').insert(models);
      });
  }
};

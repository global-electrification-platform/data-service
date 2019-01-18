const fs = require('fs-extra');
const yaml = require('js-yaml');
const path = require('path');
const Joi = require('joi');
const _ = require('lodash');
const { detailedDiff } = require('deep-object-diff');

const { print, userError, outputMiniTable } = require('./utils');
const modelSchema = require('./model-joi-schema');
const { reconcileTechLayers } = require('../app/tech-layers-config');

/**
 * Extracts the model name from the path
 *
 * @param {string} modelPath Path to the model
 *
 * @returns String
 */
function getModelIdFromPath (modelPath) {
  return path.parse(modelPath).name;
}

/**
 * Gets the model yml file from directory
 * @param {string} dirPath Path to the model directory
 *
 * @see userError()
 * @throws Error
 *
 * @return Model yml file
 */
async function getModelFromDir (dirPath) {
  const dir = await fs.readdir(dirPath);
  const models = dir.filter(f => f.endsWith('.yml'));

  if (!models.length) {
    throw userError(['No .yml file was found in given directory.', '']);
  }

  if (models.length > 1) {
    throw userError([
      'Multiple .yml files found.',
      'Please ensure that there is only one model file per model directory',
      ''
    ]);
  }

  return path.join(dirPath, models[0]);
}

/**
 * Returns the properties of the model that are sensitive to change.
 * This is uses to check whether or not the database model can be updated.
 *
 * @param {object} doc The model
 *
 * @returns Object
 */
function getSensitiveProps (doc) {
  return {
    id: doc.id,
    country: doc.country,
    timesteps: doc.timesteps,
    levers: doc.levers.map(l => ({
      id: l.id,
      options: l.options.map(o => ({
        id: o.id,
        value: o.value
      }))
    })),
    filters: doc.filters.map(f => ({
      id: f.id,
      key: f.key,
      type: f.type,
      timestep: f.timestep === true,
      options: f.options
        ? f.options.map(o => ({
          id: o.id,
          value: o.value
        }))
        : null
    }))
  };
}

/**
 * Validates the given model
 *
 * @param {string} modelPath Path to the model
 *
 * @see userError()
 * @throws Error if validation fails
 *
 * @return object loaded model
 */
async function validateModel (modelPath) {
  const yamlModel = await fs.readFile(modelPath, 'utf-8');
  const model = yaml.load(yamlModel);
  const fileId = getModelIdFromPath(modelPath);
  if (model.id !== fileId) {
    throw userError([
      'Model errors:',
      '  File id and model id property do not match'
    ]);
  }

  const { error } = Joi.validate(model, modelSchema, { abortEarly: false });

  if (error) {
    const rows = error.details.map(err => [err.path.join('.'), err.message]);
    throw userError(['Model errors:', outputMiniTable(rows, 2)]);
  }

  return model;
}

/**
 * Validates whether sensitive props were changes between the models.
 *
 * @param {object} modelOriginal Original model
 * @param {object} modelNew New model
 *
 * @see getSensitiveProps()
 *
 * @see userError()
 * @throws Error if validation fails
 *
 * @return boolean
 */
function validateModelDiff (modelOriginal, modelNew) {
  const modelOriginalProps = getSensitiveProps(modelOriginal);
  const modelNewProps = getSensitiveProps(modelNew);

  // Quick diff.
  if (JSON.stringify(modelOriginalProps) !== JSON.stringify(modelNewProps)) {
    const diffRes = detailedDiff(modelOriginalProps, modelNewProps);
    let report = [];
    for (const p in diffRes) {
      if (Object.keys(diffRes[p]).length) {
        report.push(
          `${p} properties:`,
          JSON.stringify(diffRes[p], null, '  '),
          ''
        );
      }
    }

    throw userError([
      'Sensitive properties were changed. Ingest failed.',
      'See report below. If you need to perform these changes re-import all data.',
      '',
      ...report
    ]);
  }

  return true;
}

/**
 * Prepares the model for database insertion
 *
 * @param {object} db The current database transaction
 * @param {object} model The model
 *
 * @return object
 */
async function prepareModelRecord (db, model) {
  const id = model.id;
  const hasTimesteps = model.timesteps && model.timesteps.length;

  // Filters to keep.
  let filters = [];
  for (let filter of model.filters) {
    filter.timestep = hasTimesteps ? filter.timestep === true : false;
    if (filter.type === 'range') {
      const res = await db.raw(
        `
        SELECT
          MIN(CAST(
            "filterValues" ->> :property AS FLOAT
          )) as min,
          MAX(CAST (
            "filterValues" ->> :property AS FLOAT
          )) as max
        FROM scenarios
        WHERE "modelId" = :modelId
      `,
        { property: filter.key, modelId: id }
      );

      // Modify the filter.
      const { min, max } = res.rows[0];

      if (min === null || max === null) {
        print(
          `Invalid (min) and/or (max) for filter [${
            filter.key
          }] of model [${id}]... skipping`
        );
        continue;
      }

      filters = filters.concat({
        ...filter,
        range: {
          min: parseFloat(Math.floor(min)),
          max: parseFloat(Math.ceil(max))
        }
      });
    } else if (filter.type === 'options') {
      filters = filters.concat({ ...filter });
    } else {
      print(
        `Invalid type [${filter.type}] for filter [${
          filter.key
        }] of model [${id}]... skipping`
      );
    }
  }

  model.filters = filters;

  // Map tech layers
  const techLayers = _.get(model, 'map.techLayersConfig', []);
  _.set(model, 'map.techLayersConfig', reconcileTechLayers(techLayers));

  return model;
}

module.exports = {
  getModelIdFromPath,
  getModelFromDir,
  validateModel,
  validateModelDiff,
  prepareModelRecord,
  getSensitiveProps
};

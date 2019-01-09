const config = require('config');
const { readFile, readdir } = require('fs-extra');
const { join } = require('path');
const yaml = require('js-yaml');
const get = require('lodash.get');
const set = require('lodash.set');
const { reconcileTechLayers } = require('../app/tech-layers-config');

const sourceDataDir = join(__dirname, '..', config.get('sourceDataDir'));
const modelsDir = join(sourceDataDir, 'models');

exports.seed = async function (knex) {
  const modelFilenames = await readdir(modelsDir);
  // Load models from samples directory
  let models = await Promise.all(
    modelFilenames
      .filter(f => f.endsWith('.yml'))
      .map(async m => {
        const yamlModel = await readFile(join(modelsDir, m), 'utf-8');
        return yaml.load(yamlModel);
      })
  );

  // Perform database tasks
  if (models.length > 0) {
    await knex('models').del();

    // Modify the models, adding the filter data computed from scenario vals.
    for (let model of models) {
      const id = model.id;
      const hasTimesteps = model.timesteps && model.timesteps.length;

      // Filters to keep.
      let filters = [];
      for (let filter of model.filters) {
        filter.timestep = hasTimesteps ? filter.timestep === true : false;
        if (filter.type === 'range') {
          if (!filter.key) {
            // eslint-disable-next-line
            console.log(
              `No (key) found for filter of model [${id}]... skipping`
            );
            continue;
          }
          const res = await knex.raw(
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
            // eslint-disable-next-line
            console.log(
              `Invalid (min) and/or (max) for filter [${
                filter.key
              }] of model [${id}]... skipping`
            ); // eslint-disable-line
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
          // eslint-disable-next-line
          console.log(
            `Invalid type [${filter.type}] for filter [${
              filter.key
            }] of model [${id}]... skipping`
          ); // eslint-disable-line
        }
      }

      model.filters = filters;

      // Map tech layers
      const techLayers = get(model, 'map.techLayersConfig', []);
      set(model, 'map.techLayersConfig', reconcileTechLayers(techLayers));
    }

    // Inserts seed entries
    return knex('models').insert(models);
  }
};

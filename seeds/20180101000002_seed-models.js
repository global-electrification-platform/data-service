const { readFile, readdir } = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

const modelsPath = path.join(__dirname, 'fixtures', 'models');

exports.seed = async function (knex) {
  const modelFilenames = await readdir(modelsPath);
  // Load models from samples directory
  let models = await Promise.all(
    modelFilenames
      .filter(f => f.endsWith('.yml'))
      .map(async m => {
        const yamlModel = await readFile(path.join(modelsPath, m), 'utf-8');
        return yaml.load(yamlModel);
      })
  );

  // Perform database tasks
  if (models.length > 0) {
    await knex('models').del();

    // Modify the models, adding the filter data computed from scenario vals.
    for (let model of models) {
      const id = model.id;
      // Filters to keep.
      let filters = [];
      for (let filter of model.filters) {
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
                "filterValues" ->> :propetry AS FLOAT
              )) as min,
              MAX(CAST (
                "filterValues" ->> :propetry AS FLOAT
              )) as max
            FROM scenarios
            WHERE "modelId" = :modelId
          `,
            { propetry: filter.key, modelId: id }
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
    }

    // Inserts seed entries
    return knex('models').insert(models);
  }
};

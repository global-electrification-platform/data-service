const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const _ = require('lodash');

const {
  getModelFromDir,
  validateModel,
  validateModelDiff
} = require('../../cli/models');

describe('Model related functions', function () {
  describe('getModelFromDir', function () {
    it('Throw userError when no model is found', async function () {
      try {
        await getModelFromDir(__dirname);
      } catch (error) {
        const msgs = error.details;
        assert.ok(error.userError);
        assert.deepStrictEqual(msgs, [
          'No .yml file was found in given directory.',
          ''
        ]);
        return;
      }

      // Failsafe.
      assert.fail('Error not thrown');
    });

    it('Throw userError when too many yml files', async function () {
      try {
        await getModelFromDir(path.join(__dirname, 'yml-files'));
      } catch (error) {
        const msgs = error.details;
        assert.ok(error.userError);
        assert.deepStrictEqual(msgs, [
          'Multiple .yml files found.',
          'Please ensure that there is only one model file per model directory',
          ''
        ]);
        return;
      }

      // Failsafe.
      assert.fail('Error not thrown');
    });

    it('Return path to yml file', async function () {
      const modelPath = await getModelFromDir(
        path.join(__dirname, 'yml-model')
      );
      assert.strictEqual(path.join(__dirname, 'yml-model', '1.yml'), modelPath);
    });
  });

  describe('validateModel', function () {
    it('Throw userError model if is not valid', async function () {
      try {
        await validateModel(
          path.join(__dirname, 'yml-model-invalid-id', '1.yml')
        );
      } catch (error) {
        const msgs = error.details;
        assert.ok(error.userError);
        assert.deepStrictEqual(msgs, [
          'Model errors:',
          '  File id and model id property do not match'
        ]);
        return;
      }

      // Failsafe.
      assert.fail('Error not thrown');
    });

    it('Output table with errors', async function () {
      // Only checking the table output. Correctness of schema is validated
      // elsewhere.
      try {
        await validateModel(
          path.join(__dirname, 'yml-model-missing-props', 'mw-1.yml')
        );
      } catch (error) {
        const msgs = error.details;
        assert.ok(error.userError);
        assert.deepStrictEqual(msgs, [
          'Model errors:',
          `  attribution   "attribution" is required   
  description   "description" is required   
  levers        "levers" is required        
  filters       "filters" is required       
`
        ]);
        return;
      }

      // Failsafe.
      assert.fail('Error not thrown');
    });

    it('Return model when everything is correct', async function () {
      const p = path.join(__dirname, 'yml-model-valid', 'mw-1.yml');
      const validatedModel = await validateModel(p);
      const originalModel = yaml.load(await fs.readFile(p, 'utf-8'));

      assert.deepStrictEqual(validatedModel, originalModel);
    });
  });

  describe('validateModelDiff', function () {
    it('Throw error when changing sensitive properties', async function () {
      const p = path.join(__dirname, 'yml-model-valid', 'mw-1.yml');
      const originalModel = yaml.load(await fs.readFile(p, 'utf-8'));

      const copy = _.cloneDeep(originalModel);

      delete copy.id;
      copy.country = 'new-country';
      copy.filters[0].key = 'anotherKey';
      copy.filters.push({ id: 'new-filter' });

      try {
        await validateModelDiff(originalModel, copy);
      } catch (error) {
        const msgs = error.details;
        assert.ok(error.userError);
        assert.deepStrictEqual(msgs, [
          'Sensitive properties were changed. Ingest failed.',
          'See report below. If you need to perform these changes re-import all data.',
          '',
          'added properties:',
          `{
  "filters": {
    "6": {
      "id": "new-filter",
      "timestep": false,
      "options": null
    }
  }
}`,
          '',
          'updated properties:',
          `{
  "country": "new-country",
  "filters": {
    "0": {
      "key": "anotherKey"
    }
  }
}`,
          ''
        ]);
        return;
      }

      // Failsafe.
      assert.fail('Error not thrown');
    });

    it('Return true when sensitive properties were not changed', async function () {
      const p = path.join(__dirname, 'yml-model-valid', 'mw-1.yml');
      const originalModel = yaml.load(await fs.readFile(p, 'utf-8'));

      const copy = _.cloneDeep(originalModel);

      copy.description = 'new-description';
      copy.filters[0].label = 'a new label';
      copy.filters[2].options[0].lable = 'a new filter option label';
      copy.levers[0].description = 'a new lever description';

      assert.ok(await validateModelDiff(originalModel, copy));
    });
  });

  describe.skip('prepareModelRecord', function () {
    // This requires data to be in the database.
    // Figure out what's the best way to test.
  });
});

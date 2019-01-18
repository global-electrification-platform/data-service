const assert = require('assert');
const path = require('path');

const {
  getModelScenariosFromDir,
  validateModelScenario,
  prepareScenarioRecords
} = require('../../cli/scenarios');

describe('Scenario related functions', function () {
  describe('getModelScenariosFromDir', function () {
    it('Throw userError when no scenarios are found', async function () {
      try {
        await getModelScenariosFromDir(__dirname);
      } catch (error) {
        const msgs = error.details;
        assert.ok(error.userError);
        assert.deepStrictEqual(msgs, [
          'No scenarios for this model were found.',
          ''
        ]);
        return;
      }

      // Failsafe.
      assert.fail('Error not thrown');
    });

    it('Return array with scenarios', async function () {
      const scenarios = await getModelScenariosFromDir(
        path.join(__dirname, 'csv-files')
      );
      assert.deepStrictEqual(['1.csv', '2.csv', '3.csv'], scenarios);
    });
  });

  describe('validateModelScenario', function () {
    it('Throw userError when scenario name is not valid', async function () {
      try {
        await validateModelScenario(null, 'fake-path/scenario-name.csv');
      } catch (error) {
        const msgs = error.details;
        assert.ok(error.userError);
        assert.deepStrictEqual(msgs, ['Malformed file name']);
        return;
      }

      // Failsafe.
      assert.fail('Error not thrown');
    });

    it('Throw userError when scenario name does not match model id', async function () {
      try {
        await validateModelScenario({ id: 'mw-2' }, 'fake-path/mw-1-0_0.csv');
      } catch (error) {
        const msgs = error.details;
        assert.ok(error.userError);
        assert.deepStrictEqual(msgs, ["Model id doesn't match model"]);
        return;
      }

      // Failsafe.
      assert.fail('Error not thrown');
    });

    it('Throw userError when scenario levers do not match model', async function () {
      try {
        const model = {
          id: 'mw-1',
          levers: [{}]
        };
        await validateModelScenario(model, 'fake-path/mw-1-0_0.csv');
      } catch (error) {
        const msgs = error.details;
        assert.ok(error.userError);
        assert.deepStrictEqual(msgs, [
          'Filename levers count do not match model levers count'
        ]);
        return;
      }

      // Failsafe.
      assert.fail('Error not thrown');
    });

    it('Throw userError when scenario ID is missing', async function () {
      try {
        const model = {
          id: 'mw-1',
          levers: [{}, {}]
        };
        await validateModelScenario(
          model,
          path.join(__dirname, 'csv-invalid-no-id/mw-1-0_0.csv')
        );
      } catch (error) {
        const msgs = error.details;
        assert.ok(error.userError);
        assert.deepStrictEqual(msgs, ['Found empty value for ID at line 2']);
        return;
      }

      // Failsafe.
      assert.fail('Error not thrown');
    });

    it('Throw userError when scenario FinalElecCode contains invalid values - no timesteps', async function () {
      try {
        const model = {
          id: 'mw-1',
          levers: [{}, {}]
        };
        await validateModelScenario(
          model,
          path.join(__dirname, 'csv-invalid-FinalElecCode/mw-1-0_0.csv')
        );
      } catch (error) {
        const msgs = error.details;
        assert.ok(error.userError);
        assert.deepStrictEqual(msgs, [
          'Found empty value for FinalElecCode at line 2',
          'Found 99 value for FinalElecCode at line 4',
          'Found null value for FinalElecCode at line 5'
        ]);
        return;
      }

      // Failsafe.
      assert.fail('Error not thrown');
    });

    it('Throw userError when scenario FinalElecCode contains invalid values - with timesteps', async function () {
      try {
        const model = {
          id: 'mw-1',
          timesteps: [2023, 2030],
          levers: [{}, {}]
        };
        await validateModelScenario(
          model,
          path.join(
            __dirname,
            'csv-invalid-FinalElecCode-timesteps/mw-1-0_0.csv'
          )
        );
      } catch (error) {
        const msgs = error.details;
        assert.ok(error.userError);
        assert.deepStrictEqual(msgs, [
          'Found empty value for FinalElecCode2023 at line 2',
          'Found empty value for FinalElecCode2030 at line 2',
          'Found empty value for FinalElecCode2023 at line 5'
        ]);
        return;
      }

      // Failsafe.
      assert.fail('Error not thrown');
    });

    it('Return true when valid', async function () {
      const model = {
        id: 'mw-1',
        timesteps: [2023, 2030],
        levers: [{}, {}]
      };
      const result = await validateModelScenario(
        model,
        path.join(
          __dirname,
          'csv-valid-99-intermediate/mw-1-0_0.csv'
        )
      );

      assert.ok(result);
    });
  });

  describe('prepareScenarioRecords', function () {
    it('Prepare scenario records - no timesteps', async function () {
      const model = {
        id: 'mw-1',
        timesteps: [],
        levers: [{}, {}],
        filters: [
          {
            id: 1,
            key: 'FinalElecCode',
            type: 'options'
          },
          {
            id: 2,
            key: 'anotherFilter',
            type: 'range'
          },
          {
            id: 3,
            key: 'nonExistent',
            type: 'options'
          }
        ]
      };
      const records = await prepareScenarioRecords(
        model,
        path.join(__dirname, 'csv-valid/mw-1-0_0.csv')
      );

      const expected = [
        {
          modelId: 'mw-1',
          scenarioId: 'mw-1-0_0',
          featureId: 1001,
          summary: {
            FinalElecCode: 1,
            InvestmentCost: 1,
            NewCapacity: 1,
            Pop: 1
          },
          filterValues: {
            FinalElecCode: '1',
            anotherFilter: 1,
            // Will be stripped when inserting in DB because JSON.
            nonExistent: undefined
          }
        },
        {
          modelId: 'mw-1',
          scenarioId: 'mw-1-0_0',
          featureId: 1002,
          summary: {
            FinalElecCode: 2,
            InvestmentCost: 10,
            NewCapacity: 10,
            Pop: 10
          },
          filterValues: {
            FinalElecCode: '2',
            anotherFilter: 10,
            // Will be stripped when inserting in DB because JSON.
            nonExistent: undefined
          }
        },
        {
          modelId: 'mw-1',
          scenarioId: 'mw-1-0_0',
          featureId: 1003,
          summary: {
            FinalElecCode: 3,
            InvestmentCost: 20,
            NewCapacity: 20,
            Pop: 20
          },
          filterValues: {
            FinalElecCode: '3',
            anotherFilter: 20,
            // Will be stripped when inserting in DB because JSON.
            nonExistent: undefined
          }
        },
        {
          modelId: 'mw-1',
          scenarioId: 'mw-1-0_0',
          featureId: 1004,
          summary: {
            FinalElecCode: 4,
            InvestmentCost: null,
            NewCapacity: null,
            Pop: null
          },
          filterValues: {
            FinalElecCode: '4',
            anotherFilter: 30,
            // Will be stripped when inserting in DB because JSON.
            nonExistent: undefined
          }
        }
      ];
      assert.deepStrictEqual(records, expected);
    });

    it('Prepare scenario records - with timesteps', async function () {
      const model = {
        id: 'mw-1',
        timesteps: [2030],
        levers: [{}, {}],
        filters: [
          {
            id: 1,
            key: 'FinalElecCode',
            timestep: true,
            type: 'options'
          },
          {
            id: 1,
            key: 'anotherFilter',
            timestep: false,
            type: 'options'
          }
        ]
      };
      const records = await prepareScenarioRecords(
        model,
        path.join(__dirname, 'csv-valid-timesteps/mw-1-0_0.csv')
      );

      const expected = [
        {
          modelId: 'mw-1',
          scenarioId: 'mw-1-0_0',
          featureId: 1001,
          summary: {
            FinalElecCode2030: 1,
            InvestmentCost2030: 1,
            NewCapacity2030: 1,
            Pop2030: 1
          },
          filterValues: { FinalElecCode2030: '1', anotherFilter: '1' }
        },
        {
          modelId: 'mw-1',
          scenarioId: 'mw-1-0_0',
          featureId: 1002,
          summary: {
            FinalElecCode2030: 2,
            InvestmentCost2030: 10,
            NewCapacity2030: 10,
            Pop2030: 10
          },
          filterValues: { FinalElecCode2030: '2', anotherFilter: '10' }
        },
        {
          modelId: 'mw-1',
          scenarioId: 'mw-1-0_0',
          featureId: 1003,
          summary: {
            FinalElecCode2030: 3,
            InvestmentCost2030: 20,
            NewCapacity2030: 20,
            Pop2030: 20
          },
          filterValues: { FinalElecCode2030: '3', anotherFilter: '20' }
        },
        {
          modelId: 'mw-1',
          scenarioId: 'mw-1-0_0',
          featureId: 1004,
          summary: {
            FinalElecCode2030: 4,
            InvestmentCost2030: null,
            NewCapacity2030: null,
            Pop2030: null
          },
          filterValues: { FinalElecCode2030: '4', anotherFilter: '30' }
        }
      ];
      assert.deepStrictEqual(records, expected);
    });
  });
});

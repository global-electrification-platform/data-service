const { stringify } = require('qs');
const _ = require('lodash');
const path = require('path');
const csv = require('fast-csv');
const supertest = require('supertest');

/* global server,fixturesPath */

describe('Endpoint: /scenarios', function () {
  it('GET /scenarios/mw-1-0_0_0 returns feature types and summary', async function () {
    const scenarioId = 'mw-1-0_0_0';
    const results = await calculateScenarioSummary(scenarioId);

    return supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .expect(200, results);
  });

  it('GET /scenarios/mw-1-0_0_0 with malformed range filter return error', async function () {
    const scenarioId = 'mw-1-0_0_0';

    // Not an Array
    await supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .query(stringify({ filters: { SubstationDist: 500 } }))
      .expect(400);

    // Range without a key
    await supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .query(
        stringify({
          filters: [{ notKey: 'SubstationDist', min: 1000 }]
        })
      )
      .expect(400);

    // Range without min or max values
    await supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .query(
        stringify({
          filters: [{ key: 'SubstationDist', otherValue: 100 }]
        })
      )
      .expect(400);
  });

  it('GET /scenarios/mw-1-0_0_0 with filtering by a minimun value', async function () {
    const scenarioId = 'mw-1-0_0_0';
    const filters = [{ key: 'SubstationDist', min: 95, max: 110 }];
    const scenarioResults = await calculateScenarioSummary(scenarioId, filters);

    // Filter range is not an array
    await supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .query(stringify({ filters }))
      .expect(200, scenarioResults);
  });

  it('GET /scenarios/mw-1-0_0_0, filtering by one option', async function () {
    const scenarioId = 'mw-1-0_0_0';
    const query = {
      filters: [{ key: 'FinalElecCode2030', options: ['1'] }]
    };

    const scenarioResults = await calculateScenarioSummary(
      scenarioId,
      query.filters
    );

    // Filter range is not an array
    await supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .query(stringify(query))
      .expect(200, scenarioResults);
  });

  it('GET /scenarios/mw-1-0_0_0, filtering by two options', async function () {
    const scenarioId = 'mw-1-0_0_0';
    const query = {
      filters: [{ key: 'FinalElecCode2030', options: ['2', '3'] }]
    };
    const scenarioResults = await calculateScenarioSummary(
      scenarioId,
      query.filters
    );

    // Filter range is not an array
    await supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .query(stringify(query))
      .expect(200, scenarioResults);
  });

  it('GET /scenarios/mw-1-0_0_0, filtering by options AND range', async function () {
    const scenarioId = 'mw-1-0_0_0';
    const query = {
      filters: [
        { key: 'FinalElecCode2030', options: ['1', '5'] },
        { key: 'Pop', min: 30, max: 150 }
      ]
    };
    const scenarioResults = await calculateScenarioSummary(
      scenarioId,
      query.filters
    );

    // Filter range is not an array
    await supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .query(stringify(query))
      .expect(200, scenarioResults);
  });
});

async function calculateScenarioSummary (id, filters) {
  const scenarioPath = path.join(fixturesPath, 'scenarios', `${id}.csv`);
  let features = [];
  const results = {
    id,
    featureTypes: [],
    summary: {
      electrifiedPopulation: 0,
      investmentCost: 0,
      newCapacity: 0
    }
  };

  return new Promise(function (resolve, reject) {
    csv
      .fromPath(scenarioPath, { headers: true, delimiter: ',' })
      .on('data', entry => {
        features.push({
          ...entry,
          id: entry.ID,
          electrificationTech: parseInt(entry.FinalElecCode2030),
          electrifiedPopulation: parseFloat(entry.Pop),
          investmentCost: parseFloat(entry.InvestmentCost2030),
          newCapacity: parseFloat(entry.NewCapacity2030)
        });
      })
      .on('end', async () => {
        // Apply filters if defined
        if (filters) {
          filters.forEach(filter => {
            features = _.filter(features, entry => {
              const value = entry[filter.key];
              const { min, max, options } = filter;

              if (typeof min !== 'undefined' && parseFloat(value) < min) {
                return false;
              }

              if (typeof max !== 'undefined' && parseFloat(value) > max) {
                return false;
              }

              if (
                typeof options !== 'undefined' &&
                !options.includes(value.toString())
              ) {
                return false;
              }

              return true;
            });
          });
        }

        // Init summary
        results.summary = {
          electrifiedPopulation: 0,
          investmentCost: 0,
          newCapacity: 0
        };

        // Aggregate key properties
        features.forEach(f => {
          results.summary.electrifiedPopulation += f.electrifiedPopulation;
          results.summary.investmentCost += f.investmentCost;
          results.summary.newCapacity += f.newCapacity;
        });

        // Round summary
        results.summary = {
          electrifiedPopulation: _.round(
            results.summary.electrifiedPopulation,
            2
          ),
          investmentCost: _.round(results.summary.investmentCost, 2),
          newCapacity: _.round(results.summary.newCapacity, 2)
        };

        for (const feature of features) {
          results.featureTypes[feature.id] = feature.electrificationTech;
        }

        results.featureTypes = results.featureTypes.toString();

        resolve(results);
      })
      .on('error', reject);
  });
}

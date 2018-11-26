const qs = require('qs');
const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const csv = require('fast-csv');
const supertest = require('supertest');

const server = require('../app');

const fixturesPath = path.join(__dirname, '..', 'fixtures');

describe('all tests', function () {
  describe('endpoint /', function () {
    it('should have statusCode 200', function () {
      return supertest(server.listener)
        .get('/')
        .expect(200, 'GEP Data Service');
    });
  });

  describe('endpoint /countries', function () {
    it('GET /countries returns status 200 and countries', async function () {
      return supertest(server.listener)
        .get('/countries')
        .expect(200, {
          countries: [
            {
              id: 'cg',
              name: 'Congo'
            },
            {
              id: 'ke',
              name: 'Kenya'
            },
            {
              id: 'mw',
              name: 'Malawi'
            }
          ]
        });
    });
  });

  describe('endpoint /countries/{id}', function () {
    it('GET /countries/zz returns status 404 (Not found)', function () {
      return supertest(server.listener)
        .get('/countries/zz')
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: 'Country code not found.'
        });
    });

    it('GET /countries/ZZZZZZ returns status 400 (Bad request)', function () {
      return supertest(server.listener)
        .get('/countries/ZZZZZZ')
        .expect(400);
    });

    it('GET /countries/cg returns status 200, with country models', async function () {
      const cg1ModelPath = path.join(fixturesPath, 'models', 'cg-1.yml');
      let cg1Model = await fs.readFile(cg1ModelPath);
      cg1Model = yaml.load(cg1Model);
      return supertest(server.listener)
        .get('/countries/cg')
        .expect(200, {
          id: 'cg',
          name: 'Congo',
          models: [cg1Model]
        });
    });

    it('GET /countries/MW (uppercase) returns status 200, with country models', async function () {
      const mw1ModelPath = path.join(fixturesPath, 'models', 'mw-1.yml');
      let mw1Model = await fs.readFile(mw1ModelPath);
      mw1Model = yaml.load(mw1Model);

      const mw2ModelPath = path.join(fixturesPath, 'models', 'mw-2.yml');
      let mw2Model = await fs.readFile(mw2ModelPath);
      mw2Model = yaml.load(mw2Model);

      return supertest(server.listener)
        .get('/countries/MW')
        .expect(200, {
          id: 'mw',
          name: 'Malawi',
          models: [mw1Model, mw2Model]
        });
    });
  });

  describe('/scenarios endpoint', function () {
    it('GET /scenarios/mw-1-0_0_0 returns feature types and summary', async function () {
      const scenarioId = 'mw-1-0_0_0';
      const results = await calculateScenarioSummary(scenarioId);

      return supertest(server.listener)
        .get(`/scenarios/${scenarioId}`)
        .expect(200, results);
    });

    it('GET /scenarios/mw-1-0_0_0 with malformed range filter return error', async function () {
      const scenarioId = 'mw-1-0_0_0';

      // Test mal-formed filters parameters
      await supertest(server.listener)
        .get(`/scenarios/${scenarioId}`)
        .query({ filters: { electrifiedPopulation: 500 } })
        .expect(400);

      await supertest(server.listener)
        .get(`/scenarios/${scenarioId}`)
        .query({
          filters: { electrifiedPopulation: [1000, 100] }
        })
        .expect(400);

      await supertest(server.listener)
        .get(`/scenarios/${scenarioId}`)
        .query({
          filters: [{ id: 'electrifiedPopulation', range: ['a', 100] }]
        })
        .expect(400);

      await supertest(server.listener)
        .get(`/scenarios/${scenarioId}`)
        .query({
          filters: [{ id: 'electrifiedPopulation', range: [100, 'b'] }]
        })
        .expect(400);
    });

    it('GET /scenarios/mw-1-0_0_0 with well formed range filter', async function () {
      const scenarioId = 'mw-1-0_0_0';
      const query = {
        filters: [{ id: 'electrifiedPopulation', range: [30, 50] }]
      };
      const scenarioResults = await calculateScenarioSummary(
        scenarioId,
        query.filters
      );

      // Filter range is not an array
      await supertest(server.listener)
        .get(`/scenarios/${scenarioId}`)
        .query(qs.stringify(query))
        .expect(200, scenarioResults);
    });

    it('GET /scenarios/mw-1-0_0_0, filtering by one option', async function () {
      const scenarioId = 'mw-1-0_0_0';
      const query = {
        filters: [{ id: 'electrificationTech', options: ['sa-diesel'] }]
      };
      const scenarioResults = await calculateScenarioSummary(
        scenarioId,
        query.filters
      );

      // Filter range is not an array
      await supertest(server.listener)
        .get(`/scenarios/${scenarioId}`)
        .query(qs.stringify(query))
        .expect(200, scenarioResults);
    });

    it('GET /scenarios/mw-1-0_0_0, filtering by one option', async function () {
      const scenarioId = 'mw-1-0_0_0';
      const query = {
        filters: [{ id: 'electrificationTech', options: ['sa-pv', 'grid'] }]
      };
      const scenarioResults = await calculateScenarioSummary(
        scenarioId,
        query.filters
      );

      // Filter range is not an array
      await supertest(server.listener)
        .get(`/scenarios/${scenarioId}`)
        .query(qs.stringify(query))
        .expect(200, scenarioResults);
    });

    it('GET /scenarios/mw-1-0_0_0, filtering by options AND range', async function () {
      const scenarioId = 'mw-1-0_0_0';
      const query = {
        filters: [
          { id: 'electrificationTech', options: ['sa-pv', 'grid'] },
          { id: 'electrifiedPopulation', options: [30, 50] }
        ]
      };
      const scenarioResults = await calculateScenarioSummary(
        scenarioId,
        query.filters
      );

      // Filter range is not an array
      await supertest(server.listener)
        .get(`/scenarios/${scenarioId}`)
        .query(qs.stringify(query))
        .expect(200, scenarioResults);
    });
  });
});

after(() => {
  server.stop();
});

async function calculateScenarioSummary (id, filters) {
  const scenarioPath = path.join(fixturesPath, 'scenarios', `${id}.csv`);
  const results = {
    id,
    features: [],
    summary: {
      electrifiedPopulation: 0,
      investmentCost: 0,
      newCapacity: 0
    }
  };

  const techs = [
    'grid',
    'sa-diesel',
    'sa-pv',
    'mg-diesel',
    'mg-pv',
    'mg-wind',
    'mg-hydro'
  ];
  return new Promise(function (resolve, reject) {
    csv
      .fromPath(scenarioPath, { headers: true, delimiter: ';' })
      .on('data', entry => {
        results.features.push({
          id: entry.ID,
          electrificationTech: techs[entry.FinalElecCode2030],
          electrifiedPopulation: parseFloat(entry.Pop),
          investmentCost: parseFloat(entry.InvestmentCost2030),
          newCapacity: parseFloat(entry.NewCapacity2030)
        });
      })
      .on('end', async () => {
        // Apply filters
        if (filters) {
          filters.forEach(filter => {
            results.features = _.filter(results.features, entry => {
              const value = entry[filter.id];
              const { range, options } = filter;
              if (range) {
                return _.inRange(value, range[0], range[1]);
              } else {
                return options.includes(value);
              }
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
        results.features.forEach(f => {
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

        // Only keep tech property for features
        results.features = results.features.map(f => {
          return { id: f.id, electrificationTech: f.electrificationTech };
        });

        // Sort features by id
        results.features = _.sortBy(results.features, 'id');

        resolve(results);
      })
      .on('error', reject);
  });
}

const supertest = require('supertest');

/* global server */

describe('Endpoint: /scenarios/{sid}/features/{fid}', function () {
  it('Should return 404 for non existent scenario', async function () {
    const scenarioId = 'nonexistent';
    const featureId = 0;

    return supertest(server.listener)
      .get(`/scenarios/${scenarioId}/features/${featureId}`)
      .expect(404);
  });

  it('Should return 404 for non existent feature', async function () {
    const scenarioId = 'mw-1-0_0_0';
    const featureId = -1;

    return supertest(server.listener)
      .get(`/scenarios/${scenarioId}/features/${featureId}`)
      .expect(404);
  });

  it('Should return feature data for default year', async function () {
    const scenarioId = 'mw-1-0_0_0';
    const featureId = 168913;

    const result = {
      investmentCost: '10433.28412',
      newCapacity: '0',
      electrifiedPopulation: '80.56886028'
    };

    return supertest(server.listener)
      .get(`/scenarios/${scenarioId}/features/${featureId}`)
      .expect(200, result);
  });

  it('Should return feature data for specified year', async function () {
    const scenarioId = 'mw-1-0_0_0';
    const featureId = 168913;

    const result = {
      investmentCost: '8932.993563',
      newCapacity: '2.470467501',
      electrifiedPopulation: '99.6808255'
    };

    return supertest(server.listener)
      .get(`/scenarios/${scenarioId}/features/${featureId}`)
      .query({ year: 2030 })
      .expect(200, result);
  });
});

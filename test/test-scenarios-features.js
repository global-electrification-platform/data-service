const supertest = require('supertest');

/* global server */

describe('Endpoint: /scenarios/{sid}/features/{fid}', function () {
  it('Should return 404 for non existent feature', async function () {
    const scenarioId = 'nonexistent';
    const featureId = 0;

    return supertest(server.listener)
      .get(`/scenarios/${scenarioId}/features/${featureId}`)
      .expect(404);
  });

  it('Should return feature data', async function () {
    const scenarioId = 'mw-1-0_0_0';
    const featureId = 168913;

    const result = {
      investmentCost: '8932.993563',
      newCapacity: '2.470467501',
      electrifiedPopulation: '61.72818213'
    };

    return supertest(server.listener)
      .get(`/scenarios/${scenarioId}/features/${featureId}`)
      .expect(200, result);
  });
});

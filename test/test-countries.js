const supertest = require('supertest');
const fs = require('fs-extra');
const path = require('path');

/* global server */

describe('Endpoint /countries', function () {
  it('GET /countries returns status 200 and countries', async function () {
    return supertest(server.listener)
      .get('/countries')
      .expect(200, {
        countries: [
          {
            id: 'CG',
            name: 'Congo'
          },
          {
            id: 'KE',
            name: 'Kenya'
          },
          {
            id: 'MW',
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
    const cg1ModelExpected = await fs.readJson(
      path.join(__dirname, 'expected-models', 'cg-1.json')
    );

    return supertest(server.listener)
      .get('/countries/cg')
      .expect(200, {
        id: 'CG',
        name: 'Congo',
        riseScores: {
          electricityAccess: 24.88,
          energyEfficiency: 8.23,
          renewableEnergy: 29,
          overall: 20.7
        },
        models: [cg1ModelExpected]
      });
  });

  it('GET /countries/MW (uppercase) returns status 200, with country models', async function () {
    const mw1ModelExpected = await fs.readJson(
      path.join(__dirname, 'expected-models', 'mw-1.json')
    );
    const mw2ModelExpected = await fs.readJson(
      path.join(__dirname, 'expected-models', 'mw-2.json')
    );

    return supertest(server.listener)
      .get('/countries/MW')
      .expect(200, {
        id: 'MW',
        name: 'Malawi',
        riseScores: {
          electricityAccess: 45.25,
          energyEfficiency: 14.38,
          renewableEnergy: 55.71,
          overall: 38.45
        },
        models: [mw2ModelExpected, mw1ModelExpected] // order by updated_at descending
      });
  });
});

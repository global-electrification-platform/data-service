const supertest = require('supertest');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const path = require('path');

/* global server,fixturesPath */

describe('Endpoint /countries', function () {
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

    // This model has many filters but only the FinalElecCode2030 is valid.
    cg1Model.filters = cg1Model.filters.filter(f => f.key === 'FinalElecCode2030');
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

    // Set the calculated values to validate against.
    mw1Model.filters[0].range = { min: 0, max: 31528 };
    mw1Model.filters[1].range = { min: 0, max: 8 };
    mw1Model.filters[3].range = { min: 31, max: 122 };
    mw1Model.filters[4].range = { min: 0, max: 14 };
    mw1Model.filters[5].range = { min: 0, max: 462 };

    const mw2ModelPath = path.join(fixturesPath, 'models', 'mw-2.yml');
    let mw2Model = await fs.readFile(mw2ModelPath);
    mw2Model = yaml.load(mw2Model);

    // Remove filters from mw2 that don't have values in the db.
    mw2Model.filters = mw2Model.filters.filter(f => f.key === 'FinalElecCode2030');

    return supertest(server.listener)
      .get('/countries/MW')
      .expect(200, {
        id: 'mw',
        name: 'Malawi',
        models: [mw1Model, mw2Model]
      });
  });
});

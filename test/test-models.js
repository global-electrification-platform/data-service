const supertest = require('supertest');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const path = require('path');

/* global server,fixturesPath */

describe('endpoint /models/{id}', function () {
  it('GET /models/zz returns status 404 (Not found)', function () {
    return supertest(server.listener)
      .get('/models/zz')
      .expect(404, {
        statusCode: 404,
        error: 'Not Found',
        message: 'Model id not found.'
      });
  });

  it('GET /models/mw-1 returns status 200, with country models', async function () {
    const mw1ModelPath = path.join(fixturesPath, 'models', 'mw-1.yml');
    let mw1Model = await fs.readFile(mw1ModelPath);
    mw1Model = yaml.load(mw1Model);

    // On import to the database the range min max are calculated.
    // Add them to the model for comparison.
    mw1Model.filters[0].range = { min: 0, max: 31528 };
    mw1Model.filters[1].range = { min: 0, max: 8 };
    mw1Model.filters[3].range = { min: 31, max: 122 };
    mw1Model.filters[4].range = { min: 0, max: 14 };
    mw1Model.filters[5].range = { min: 0, max: 462 };

    return supertest(server.listener)
      .get('/models/mw-1')
      .expect(200, mw1Model);
  });
});

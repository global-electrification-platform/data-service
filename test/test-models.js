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

    return supertest(server.listener)
      .get('/models/mw-1')
      .expect(200, mw1Model);
  });
});

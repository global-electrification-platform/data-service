const supertest = require('supertest');
const fs = require('fs-extra');
const path = require('path');

/* global server */

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
    const mw1ModelExpected = await fs.readJson(
      path.join(__dirname, 'expected-models', 'mw-1.json')
    );

    return supertest(server.listener)
      .get('/models/mw-1')
      .expect(200, mw1ModelExpected);
  });
});

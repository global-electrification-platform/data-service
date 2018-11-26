const supertest = require('supertest');

/* global server */

describe('Endpoint: /', function () {
  it('should have statusCode 200', function () {
    return supertest(server.listener)
      .get('/')
      .expect(200, 'GEP Data Service');
  });
});

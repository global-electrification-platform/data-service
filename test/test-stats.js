const supertest = require('supertest');

/* global server */

describe('Endpoint: /stats', function () {
  it('should have statusCode 200', function () {
    return supertest(server.listener)
      .get('/stats')
      .expect(200);
  });

  it('should return the correct values', function () {
    const response = {
      totals: {
        countries: 3,
        models: 4
      }
    };

    return supertest(server.listener)
      .get('/stats')
      .expect(response);
  });
});

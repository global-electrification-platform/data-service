const request = require('request-promise');
const { assert } = require('chai');

const server = require('../app');

const apiUrl = 'http://localhost:3000';

describe('root', function () {
  describe('endpoint /', function () {
    it('should have statusCode 200', function (done) {
      request({
        method: 'GET',
        uri: `${apiUrl}/`,
        resolveWithFullResponse: true
      })
        .then(async res => {
          assert.equal(res.statusCode, 200, 'Status code is 200');
          assert.equal(res.body, 'GEP Data Service');
          done();
        })
        .catch(err => {
          done(err);
        });
    });
  });

  describe('endpoint /countries', function () {
    it('GET /countries', function (done) {
      request({
        method: 'GET',
        uri: `${apiUrl}/countries`,
        json: true
      })
        .then(async res => {
          const { countries } = res;

          // Countries should be ordered by name
          assert.lengthOf(countries, 2);
          assert.deepEqual(countries[0], {
            id: 'cg',
            name: 'Congo'
          });
          assert.deepEqual(countries[1], {
            id: 'mw',
            name: 'Malawi'
          });

          done();
        })
        .catch(err => {
          done(err);
        });
    });
  });
});

after(() => {
  server.stop();
});

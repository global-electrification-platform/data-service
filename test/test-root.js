const supertest = require('supertest');

const server = require('../app');

describe('all tests', function () {
  describe('endpoint /', function () {
    it('should have statusCode 200', function () {
      return supertest(server.listener)
        .get('/')
        .expect(200, 'GEP Data Service');
    });
  });

  describe('endpoint /countries', function () {
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
      return supertest(server.listener)
        .get('/countries/cg')
        .expect(200, {
          id: 'cg',
          name: 'Congo',
          models: [
            {
              id: 'cg-1',
              attribution: {
                author: 'KTH',
                url: 'http:/kth.se'
              },
              description:
                'Magna et commodo minim id pariatur non voluptate mollit sit sit culpa eu ut cupidatat. Officia aliquip nisi dolor velit. Quis tempor in nulla officia cillum sit culpa ea id. Ea esse irure cillum non esse ullamco ipsum esse. Enim nulla magna ullamco aliqua esse dolore do incididunt nulla sint amet tempor.',
              name: 'Congo OnSSET v1.0',
              updated_at: '2018-10-12',
              version: 'v1.0'
            },
            {
              id: 'cg-2',
              attribution: {
                author: 'KTH',
                url: 'http:/kth.se'
              },
              description:
                'Nulla ullamco cupidatat nisi esse magna occaecat cupidatat occaecat proident in nisi. Dolore tempor eu aliquip nulla officia incididunt duis dolore laboris voluptate proident fugiat sunt. Laboris excepteur Lorem id laboris magna reprehenderit. Duis officia mollit nostrud labore voluptate ullamco ea non aliquip proident id proident sint. Lorem aute nisi cupidatat ullamco ea laborum fugiat id est.',
              name: 'Congo OnSSET v1.2',
              updated_at: '2018-10-25',
              version: 'v1.2'
            }
          ]
        });
    });

    it('GET /countries/MW (upppercase) returns status 200, with country models', async function () {
      return supertest(server.listener)
        .get('/countries/MW')
        .expect(200, {
          id: 'mw',
          name: 'Malawi',
          models: [
            {
              id: 'mw-1',
              attribution: {
                author: 'KTH',
                url: 'http:/kth.se'
              },
              description:
                'Amet qui ea do adipisicing deserunt culpa. Ullamco dolor irure ea ut culpa reprehenderit reprehenderit sunt ad aute proident. Elit do Lorem culpa excepteur do consequat incididunt esse fugiat aute velit velit sint. Velit dolor magna occaecat nisi exercitation voluptate nostrud sit. Culpa sit id dolor proident et ea sunt mollit proident laboris cillum ullamco aute.',
              version: 'v1.0',
              name: 'Malawi OnSSET v1.0',
              updated_at: '2018-10-21'
            }
          ]
        });
    });
  });
});

after(() => {
  server.stop();
});

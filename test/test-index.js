const path = require('path');
const server = require('../app');
const fixturesPath = path.join(__dirname, '..', 'fixtures');

// Export globals
global.server = server;
global.fixturesPath = fixturesPath;

describe('GEP Data Service', function () {
  before(async function () {
    await server.start();
  });

  require('./test-root.js');
  require('./test-countries.js');
  require('./test-scenarios.js');

  after(async function () {
    await server.stop();
  });
});

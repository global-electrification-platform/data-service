const path = require('path');
const server = require('../app');

// Export globals
global.server = server;
global.fixturesPath = path.join(__dirname, '..', 'seeds', 'fixtures');

describe('GEP Data Service', function () {
  before(async function () {
    await server.start();
  });

  require('./test-root.js');
  require('./test-stats.js');
  require('./test-countries.js');
  require('./test-scenarios.js');
  require('./test-models.js');
  require('./test-scenarios-features.js');
  require('./test-techlayers.js');

  require('./cli/test-cli-utils');
  require('./cli/test-cli-models');
  require('./cli/test-cli-scenarios');

  after(async function () {
    await server.stop();
  });
});

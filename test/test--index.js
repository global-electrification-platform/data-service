/* eslint-disable no-console */
const path = require('path');
const server = require('../app');
const db = require('../app/db');

// Export globals
global.server = server;
global.fixturesPath = path.join(__dirname, '..', 'seeds', 'fixtures');

describe('GEP Data Service', function () {
  before(async function () {
    console.log('Clearing database...');
    await db.schema.dropTableIfExists('knex_migrations');
    await db.schema.dropTableIfExists('countries');
    await db.schema.dropTableIfExists('models');
    await db.schema.dropTableIfExists('scenarios');

    console.log('Migrating...');
    await db.migrate.latest();

    console.log('Seeding...');
    await db.seed.run();

    console.log('Starting server...');
    await server.start();

    console.log('Running tests...');
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

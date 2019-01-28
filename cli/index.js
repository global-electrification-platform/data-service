const program = require('commander');

const pkg = require('../package');
const listCmd = require('./programs/list');
const deleteCmd = require('./programs/delete');
const validateCmd = require('./programs/validate');
const ingestCmd = require('./programs/ingest');

const { print } = require('./utils');

const actionHandler = fn => async (...args) => {
  const command = args[args.length - 1];
  if (!command.parent.useConfigDb && !process.env.PG_CONNECTION_STRING) {
    print('ERROR: A database connection string is needed. Use:');
    print();
    print('  export PG_CONNECTION_STRING=connection-string');
    print();
    print('If you want to use the config files run with --use-config-db');
    print();
    process.exit(1);
  }

  try {
    await fn(...args);
    process.exit(0);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      print('ERROR: Failed to connect to the database.');
      print('Check the connection string');
      process.exit(1);
    }

    if (error.userError) {
      error.details.forEach(row => console.log(row)); // eslint-disable-line
    } else {
      console.log(error); // eslint-disable-line
    }
    process.exit(1);
  }
};

program
  .description("Interacts with GEP's models and data")
  .version(pkg.version)
  .option('--use-config-db', 'Uses the config files for the db connection.');

program
  .command('list')
  .description('List models in the database')
  .action(actionHandler(listCmd));

program
  .command('delete <id...>')
  .description('Deletes models and respective data from the db')
  .action(actionHandler(deleteCmd));

program
  .command('validate <path>')
  .description('Validates a model and its data')
  .action(actionHandler(validateCmd));

program
  .command('ingest <path>')
  .description('Ingests a model and its data')
  .option(
    '--config-only',
    'Updates the non-data parts of the model configuration'
  )
  .option('--override', 'Removes data from the database and imports again')
  .action(actionHandler(ingestCmd));

program.parse(process.argv);

const program = require('commander');

const pkg = require('../package');
const listCmd = require('./programs/list');
const deleteCmd = require('./programs/delete');
const validateCmd = require('./programs/validate');
const ingestCmd = require('./programs/ingest');

// const { PG_CONNECTION_STRING } = process.env;

// if (!PG_CONNECTION_STRING) {
//   console.log('ERROR: A database connection string is needed. Use:');
//   console.log();
//   console.log('  export PG_CONNECTION_STRING=connection-string');
//   console.log();
//   process.exit(1);
// }

const actionHandler = fn => async (...args) => {
  try {
    await fn(...args);
    process.exit(0);
  } catch (error) {
    if (error.userError) {
      error.details.forEach(row => console.log(row)); // eslint-disable-line
    } else {
      console.log('error', error); // eslint-disable-line
    }
    if (!error.hideHelp) {
      program.help();
    }
    process.exit(1);
  }
};

program
  .description("Interacts with GEP's models and data")
  .version(pkg.version);

program
  .command('list')
  .description('List models in the database')
  .action(actionHandler(listCmd));

program
  .command('delete <id...>')
  .description('Deletes models from the db')
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

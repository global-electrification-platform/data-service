const db = require('../../app/db');
const { print } = require('../utils');

/**
 * Commander program
 *
 * Usage: list [options]
 *
 * List models in the database
 *
 * Options:
 *   -h, --help  output usage information
 */
module.exports = async () => {
  const models = await db('models').select('id');
  print('Existing models:');
  models.forEach(m => print(m.id));
};

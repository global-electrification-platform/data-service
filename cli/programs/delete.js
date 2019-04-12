const Promise = require('bluebird');

const db = require('../../app/db');
const { print } = require('../utils');

/**
 * Commander program.
 *
 * Usage: delete [options] <id...>
 *
 * Deletes models from the db
 * Options:
 *  -h, --help  output usage information
 */
module.exports = async ids => {
  await Promise.map(ids, id => {
    return db.transaction(async trx => {
      await trx('models')
        .where('id', id)
        .delete();
      await trx('scenarios')
        .where('modelId', id)
        .delete();
    });
  });
  print('Models and data deleted:');
  ids.forEach(i => print(i));
};

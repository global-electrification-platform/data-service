
exports.up = function (knex, Promise) {
  return knex.schema.table('models', function (t) {
    t.specificType('timesteps', 'json ARRAY');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.alterTable('models', function (t) {
    t.dropColumn('timesteps');
  });
};

exports.up = function (knex, Promise) {
  return knex.schema.table('models', function (t) {
    t.integer('baseYear');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.alterTable('models', function (t) {
    t.integer('baseYear');
  });
};

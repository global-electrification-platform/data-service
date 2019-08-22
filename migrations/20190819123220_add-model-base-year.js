exports.up = function (knex, Promise) {
  return knex.schema.table('models', function (t) {
    t.integer('baseYear').notNullable();
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.alterTable('models', function (t) {
    t.dropColumn('baseYear');
  });
};

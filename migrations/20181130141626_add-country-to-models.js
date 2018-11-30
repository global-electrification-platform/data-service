exports.up = function (knex, Promise) {
  return knex.schema.alterTable('models', function (t) {
    t.string('country', 2);
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.alterTable('models', function (t) {
    t.dropColumn('country');
  });
};

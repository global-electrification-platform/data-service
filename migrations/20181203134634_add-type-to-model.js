exports.up = function (knex, Promise) {
  return knex.schema.alterTable('models', function (t) {
    t.string('type', 15);
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.alterTable('models', function (t) {
    t.dropColumn('type');
  });
};

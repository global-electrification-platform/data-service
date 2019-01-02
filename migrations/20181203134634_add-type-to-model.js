exports.up = function (knex) {
  return knex.schema.alterTable('models', function (t) {
    t.string('type', 15);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('models', function (t) {
    t.dropColumn('type');
  });
};

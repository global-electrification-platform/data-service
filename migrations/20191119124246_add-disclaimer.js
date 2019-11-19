exports.up = function (knex) {
  return knex.schema.alterTable('models', function (t) {
    t.text('disclaimer');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('models', function (t) {
    t.dropColumn('disclaimer');
  });
};

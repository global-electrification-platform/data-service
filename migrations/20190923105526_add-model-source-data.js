exports.up = function (knex) {
  return knex.schema.alterTable('models', function (t) {
    t.json('sourceData');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('models', function (t) {
    t.dropColumn('sourceData');
  });
};

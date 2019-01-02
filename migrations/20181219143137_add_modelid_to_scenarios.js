exports.up = function (knex) {
  return knex.schema.alterTable('scenarios', function (t) {
    t.string('modelId', 15);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('scenarios', function (t) {
    t.dropColumn('modelId');
  });
};

exports.up = function (knex) {
  return knex.schema.createTable('scenarios', function (t) {
    // properties
    t.string('scenario_id');
    t.string('area_id');
    t.jsonb('results');

    // indexes and constraints
    t.index('scenario_id');
    t.unique(['scenario_id', 'area_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('scenarios');
};

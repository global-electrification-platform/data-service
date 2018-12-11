exports.up = function (knex) {
  return knex.schema.table('scenarios', function (t) {
    t.dropColumn('areaId');
    t.integer('featureId');
  });
};

exports.down = function (knex) {
  return knex.schema.table('scenarios', function (t) {
    t.dropColumn('featureId');
    t.string('areaId');
  });
};

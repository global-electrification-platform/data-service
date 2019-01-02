exports.up = function (knex) {
  return knex.schema.table('scenarios', function (t) {
    t.renameColumn('results', 'filterValues');
  });
};

exports.down = function (knex) {
  return knex.schema.table('scenarios', function (t) {
    t.renameColumn('filterValues', 'results');
  });
};

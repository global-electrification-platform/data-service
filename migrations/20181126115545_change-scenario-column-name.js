exports.up = function (knex) {
  return knex.schema.table('scenarios', function (t) {
    t.renameColumn('leastElectrificationCostTechnology', 'electrificationTech');
  });
};

exports.down = function (knex) {
  return knex.schema.table('scenarios', function (t) {
    t.renameColumn('electrificationTech', 'leastElectrificationCostTechnology');
  });
};

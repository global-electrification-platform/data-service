exports.up = function (knex, Promise) {
  return knex.schema.table('scenarios', function (t) {
    t.renameColumn('leastElectrificationCostTechnology', 'electrificationTech');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.table('scenarios', function (t) {
    t.renameColumn('electrificationTech', 'leastElectrificationCostTechnology');
  });
};

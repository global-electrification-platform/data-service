exports.up = function (knex) {
  return knex.schema.createTable('scenarios', function (t) {
    // properties
    t.string('scenarioId');
    t.string('areaId');
    t.string('leastElectrificationCostTechnology');
    t.decimal('investmentCost', null);
    t.decimal('newCapacity', null);
    t.decimal('electrifiedPopulation', null);
    t.jsonb('results');

    // indexes and constraints
    t.index('scenarioId');
    t.unique(['scenarioId', 'areaId']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('scenarios');
};

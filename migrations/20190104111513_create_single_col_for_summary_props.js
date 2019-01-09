exports.up = function (knex, Promise) {
  return knex.schema.alterTable('scenarios', function (t) {
    t.json('summary');
    t.dropColumn('electrificationTech');
    t.dropColumn('investmentCost');
    t.dropColumn('newCapacity');
    t.dropColumn('electrifiedPopulation');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.alterTable('scenarios', function (t) {
    t.dropColumn('summary');
    t.integer('electrificationTech');
    t.decimal('investmentCost', null);
    t.decimal('newCapacity', null);
    t.decimal('electrifiedPopulation', null);
  });
};

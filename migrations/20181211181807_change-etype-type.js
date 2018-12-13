exports.up = function (knex) {
  return knex.schema.table('scenarios', function (t) {
    t.integer('electrificationTech').alter();
  });
};

exports.down = function (knex) {
  return knex.schema.table('scenarios', function (t) {
    t.string('electrificationTech').alter();
  });
};

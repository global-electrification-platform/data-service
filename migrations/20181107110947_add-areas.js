exports.up = function (knex) {
  return knex.schema.createTable('areas', function (table) {
    table.string('id').primary();
    table.jsonb('meta');
    table.specificType('geometry', 'geometry');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('areas');
};

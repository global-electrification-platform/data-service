exports.up = function (knex) {
  return knex.schema.createTable('countries', function (table) {
    table.string('id').primary();
    table.string('name');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('countries');
};

exports.up = function (knex) {
  return knex.schema.createTable('models', function (table) {
    table.string('id').primary();
    table.json('attribution');
    table.text('description');
    table.string('name');
    table.date('updated_at');
    table.string('version');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('models');
};

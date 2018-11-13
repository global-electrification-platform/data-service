exports.up = function (knex) {
  return knex.schema.createTable('models', function (table) {
    table.string('id').primary();
    table.date('updated_at');
    table.json('attribution');
    table.specificType('levers', 'json ARRAY');
    table.specificType('filters', 'json ARRAY');
    table.json('map');
    table.string('name');
    table.string('version');
    table.text('description');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('models');
};

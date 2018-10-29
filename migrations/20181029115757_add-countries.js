exports.up = function(knex, Promise) {
  return knex.schema.createTable("countries", function(table) {
    table.string("id").primary();
    table.string("name");
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable("countries");
};

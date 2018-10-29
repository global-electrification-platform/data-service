module.exports = {
  client: "postgresql",
  connection: {
    database: "gep-data-service-test",
    user: "gep-data-service-test",
    host: "localhost",
    port: "15433"
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    tableName: "knex_migrations"
  }
};

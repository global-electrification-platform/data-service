const config = require('config');

const knexConfig = process.env.PG_CONNECTION_STRING || config.get('knex');

module.exports = require('knex')(knexConfig);

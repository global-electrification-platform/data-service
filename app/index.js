const _ = require('lodash');
const boom = require('boom');
const Hapi = require('hapi');
const db = require('./db');
const Joi = require('joi');

const server = Hapi.server({
  port: process.env.PORT || 3000,
  host: 'localhost'
});

const init = async () => {
  await server.start();
  console.log(`Server running at: ${server.info.uri}`); // eslint-disable-line
};

// ROUTES

server.route({
  method: 'GET',
  path: '/',
  handler: function (request, h) {
    return 'GEP Data Service';
  }
});

server.route({
  method: 'GET',
  path: '/countries/{id}',
  options: {
    validate: {
      params: {
        id: Joi.string().length(2)
      }
    }
  },
  handler: async function (request, h) {
    try {
      const id = request.params.id.toLowerCase();
      return await db
        .select('*')
        .from('countries')
        .where('id', id)
        .first()
        .then(async country => {
          if (!country) {
            return boom.notFound('Country code not found.');
          } else {
            country.models = await db
              .select(
                'attribution',
                'description',
                'filters',
                'id',
                'levers',
                'map',
                'name',
                'version',
                db.raw('to_char("updatedAt", \'YYYY-MM-DD\') as "updatedAt"')
              )
              .from('models')
              .where('id', 'like', `${id}-%`);
            return country;
          }
        });
    } catch (error) {
      return boom.badImplementation(error);
    }
  }
});

server.route({
  method: 'GET',
  path: '/countries',
  handler: async function (request, h) {
    try {
      const countries = await db
        .select('*')
        .from('countries')
        .orderBy('name');
      return { countries };
    } catch (error) {
      return boom.badImplementation(error);
    }
  }
});

server.route({
  method: 'GET',
  path: '/scenarios/{id}',
  options: {
    validate: {
      params: {
        id: Joi.string()
      }
    }
  },
  handler: async function (request, h) {
    try {
      const id = request.params.id.toLowerCase();

      // Get summary
      const summary = await db
        .select(
          db.raw(
            'sum("investmentCost") as "investmentCost", sum("newCapacity") as "newCapacity", sum("electrifiedPopulation") as "electrifiedPopulation"'
          )
        )
        .first()
        .where('scenarioId', id)
        .from('scenarios');

      summary.investmentCost = _.round(summary.investmentCost, 2);
      summary.newCapacity = _.round(summary.newCapacity, 2);
      summary.electrifiedPopulation = _.round(summary.electrifiedPopulation, 2);

      // Get features
      let features = await db
        .select('areaId as id', 'leastElectrificationCostTechnology')
        .where('scenarioId', id)
        .orderBy('areaId')
        .from('scenarios');

      return { id, features, summary };
    } catch (error) {
      return boom.badImplementation(error);
    }
  }
});

process.on('unhandledRejection', err => {
  console.log(err); // eslint-disable-line
  process.exit(1);
});

init();

module.exports = server;

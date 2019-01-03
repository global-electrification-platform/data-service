const _ = require('lodash');
const qs = require('qs');
const boom = require('boom');
const Hapi = require('hapi');
const db = require('./db');
const Joi = require('joi');

const server = Hapi.server({
  port: process.env.PORT || 3000,
  host: 'localhost',
  routes: {
    cors: true
  }
});

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
  path: '/stats',
  handler: async function (request, h) {
    const [totCountries, totModels] = await Promise.all([
      db
        .count()
        .from('countries')
        .first(),
      db
        .countDistinct('type')
        .from('models')
        .first()
    ]);

    return {
      totals: {
        countries: parseInt(totCountries.count),
        models: parseInt(totModels.count)
      }
    };
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
      const country = await db
        .select('*')
        .from('countries')
        .where('id', id)
        .first();

      if (!country) {
        return boom.notFound('Country code not found.');
      } else {
        country.models = await db
          .select(
            'attribution',
            'country',
            'description',
            'filters',
            'id',
            'levers',
            'map',
            'name',
            'version',
            'type',
            db.raw('to_char("updatedAt", \'YYYY-MM-DD\') as "updatedAt"')
          )
          .from('models')
          .where('id', 'like', `${id}-%`);
        return country;
      }
    } catch (error) {
      return boom.badImplementation(error);
    }
  }
});

server.route({
  method: 'GET',
  path: '/models/{id}',
  handler: async function (request, h) {
    try {
      const id = request.params.id.toLowerCase();
      const model = await db
        .select(
          'attribution',
          'country',
          'description',
          'timesteps',
          'filters',
          'id',
          'levers',
          'map',
          'name',
          'type',
          'version',
          db.raw('to_char("updatedAt", \'YYYY-MM-DD\') as "updatedAt"')
        )
        .from('models')
        .where('id', id)
        .first();

      return model || boom.notFound('Model id not found.');
    } catch (error) {
      return boom.badImplementation(error);
    }
  }
});

server.route({
  method: 'GET',
  path: '/scenarios/{sid}/features/{fid}',
  options: {
    validate: {
      params: {
        sid: Joi.string(),
        fid: Joi.number()
      }
    }
  },
  handler: async function (request, h) {
    try {
      const sid = request.params.sid.toLowerCase();
      const fid = request.params.fid;
      const feature = await db
        .select('investmentCost', 'newCapacity', 'electrifiedPopulation')
        .from('scenarios')
        .where('scenarioId', sid)
        .where('featureId', fid)
        .first();

      return feature || boom.notFound('Feature not found.');
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
      let filters;

      // Parse query string if available
      let { query } = request;
      if (query) {
        query = qs.parse(query);

        // Validate and parse filters
        filters = query.filters;
        if (filters) {
          // Filters must be in an Array
          if (!Array.isArray(filters)) {
            throw new SyntaxError('Filters must be an Array.');
          }

          // Validate range values
          filters.forEach(filter => {
            // A filter key must be defined
            if (typeof filter.key === 'undefined') {
              throw new SyntaxError('Filter must include "key".');
            }

            if (
              typeof filter.min === 'undefined' &&
              typeof filter.max === 'undefined' &&
              typeof filter.options === 'undefined'
            ) {
              throw new SyntaxError(
                'Filter must include a valid value parameter name: "min", "max" or "options").'
              );
            }
          });
        }
      }

      const whereBuilder = builder => {
        builder.where('scenarioId', id);

        if (filters) {
          filters.forEach(filter => {
            const { key, min, max, options } = filter;

            if (typeof min !== 'undefined') {
              builder.whereRaw(`("filterValues"->>?)::numeric >= ?`, [
                key,
                parseFloat(min)
              ]);
            }

            if (typeof max !== 'undefined') {
              builder.whereRaw(`("filterValues"->>?)::numeric <= ?`, [
                key,
                parseFloat(max)
              ]);
            }

            if (Array.isArray(options) && options.length > 0) {
              builder.whereRaw(
                `("filterValues"->>?::text) in (${options
                  .map(_ => '?')
                  .join(',')})`,
                [key, ...options]
              );
            }
          });
        }
      };

      // Get summary
      const summary = await db
        .select(
          db.raw(
            'sum("investmentCost") as "investmentCost", sum("newCapacity") as "newCapacity", sum("electrifiedPopulation") as "electrifiedPopulation"'
          )
        )
        .first()
        .where(whereBuilder)
        .from('scenarios');

      summary.investmentCost = _.round(summary.investmentCost, 2);
      summary.newCapacity = _.round(summary.newCapacity, 2);
      summary.electrifiedPopulation = _.round(summary.electrifiedPopulation, 2);

      // Get features
      let features = await db
        .select(
          'featureId as id',
          'electrificationTech',
          'investmentCost',
          'newCapacity',
          'electrifiedPopulation'
        )
        .where(whereBuilder)
        .orderBy('featureId')
        .from('scenarios');

      const summaryByType = {
        electrifiedPopulation: {},
        investmentCost: {},
        newCapacity: {}
      };

      // Organize features into layers and calculate summary by type
      let featureTypes = [];
      for (const f of features) {
        featureTypes[f.id] = f.electrificationTech;

        summaryByType.electrifiedPopulation[f.electrificationTech] =
          (summaryByType.electrifiedPopulation[f.electrificationTech] || 0) +
          parseFloat(f.electrifiedPopulation);
        summaryByType.investmentCost[f.electrificationTech] =
          (summaryByType.investmentCost[f.electrificationTech] || 0) +
          parseFloat(f.investmentCost);
        summaryByType.newCapacity[f.electrificationTech] =
          (summaryByType.newCapacity[f.electrificationTech] || 0) +
          parseFloat(f.newCapacity);
      }

      featureTypes = featureTypes.toString();

      return { id, featureTypes, summary, summaryByType };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return boom.badRequest(error);
      }
      return boom.badImplementation(error);
    }
  }
});

process.on('unhandledRejection', err => {
  console.log(err); // eslint-disable-line
  process.exit(1);
});

module.exports = server;

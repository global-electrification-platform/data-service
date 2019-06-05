const config = require('config');
const _ = require('lodash');
const qs = require('qs');
const boom = require('boom');
const Hapi = require('hapi');
const Joi = require('joi');

const db = require('./db');
const { set: rset, get: rget, expire: rexpire } = require('./redis');

// Get Redis cache "time to live"
const redisCacheTtl = config.get('redis.cacheTtl');

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
        .countDistinct('country')
        .from('models')
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
      // Get countries codes by used models
      const countries = await db
        .distinct('countries.id', 'countries.name')
        .from('models')
        .join('countries', 'models.country', '=', 'countries.id');

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
      // ISO 3166-1 alpha-2 codes are uppercased
      const countryId = request.params.id.toUpperCase();

      // Get country
      const country = await db
        .select('*')
        .from('countries')
        .where('id', countryId)
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
            'timesteps',
            'id',
            'levers',
            'map',
            'name',
            'version',
            'type',
            db.raw('to_char("updatedAt", \'YYYY-MM-DD\') as "updatedAt"')
          )
          .from('models')
          .where('country', countryId)
          .orderBy('updatedAt', 'DESC');
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
      },
      query: {
        year: Joi.number()
      }
    }
  },
  handler: async function (request, h) {
    try {
      const sid = request.params.sid.toLowerCase();
      const fid = request.params.fid;

      let year = request.query.year;

      // Get information about the model
      const modelId = sid.substring(0, sid.lastIndexOf('-'));
      const model = await db('models')
        .select('filters', 'timesteps')
        .where('id', modelId)
        .first();

      // If there's no model, means that the id is not correct.
      // Assume not found.
      if (!model) return boom.notFound('Model not found.');

      // Validate timestep model
      if (model.timesteps) {
        // Set final year if none is passed
        year = year || model.timesteps[model.timesteps.length - 1];

        if (model.timesteps.indexOf(year) === -1) {
          throw new SyntaxError(
            `The "year" parameter [${year}] is invalid for this scenario. Must be one of [${model.timesteps.join(
              ', '
            )}]`
          );
        }
      } else {
        // Disregard year
        year = '';
      }

      const feature = await db
        .select(
          db.raw(`summary->>'${'InvestmentCost' + year}' as "investmentCost"`),
          db.raw(`summary->>'${'NewCapacity' + year}' as "newCapacity"`),
          db.raw(`summary->>'${'Pop' + year}' as "population"`)
        )
        .from('scenarios')
        .where('scenarioId', sid)
        .where('featureId', fid)
        .first();

      return feature || boom.notFound('Feature not found.');
    } catch (error) {
      if (error instanceof SyntaxError) {
        return boom.badRequest(error);
      }
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
  handler: async function (request) {
    try {
      const id = request.params.id.toLowerCase();
      const modelId = id.substring(0, id.lastIndexOf('-'));
      let filters;

      // Parse query string if available
      let { query } = request;
      let year = null;

      // Check for redis data with this query.
      let cacheKey;
      if (process.env.NODE_ENV !== 'test') {
        cacheKey = JSON.stringify({ id, query });
        const cachedData = await rget(cacheKey);
        if (cachedData) {
          // Once the data is requested, store for a week
          await rexpire(cacheKey, redisCacheTtl);
          return JSON.parse(cachedData);
        }
      }

      if (query) {
        query = qs.parse(query);
        year = parseInt(query.year) || null;

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

      // Get information about the model
      const model = await db('models')
        .select('filters', 'timesteps')
        .where('id', modelId)
        .first();

      // Validate timestep model
      if (model.timesteps) {
        // Set the year to the 1st value if null
        year = year || model.timesteps[0];
        if (model.timesteps.indexOf(year) === -1) {
          throw new SyntaxError(
            `The "year" parameter [${year}] is invalid for this scenario. Must be one of [${model.timesteps.join(
              ', '
            )}]`
          );
        }
      } else {
        // Disregard year
        year = '';
      }

      const summaryKeys = {
        electrificationTech: 'FinalElecCode' + year,
        investmentCost: 'InvestmentCost' + year,
        newCapacity: 'NewCapacity' + year,
        population: 'Pop' + year
      };

      const whereBuilder = builder => {
        builder
          .where('scenarioId', id)
          .whereRaw(
            `summary->>'${summaryKeys.electrificationTech}' is not null`
          );

        if (filters) {
          filters.forEach(filter => {
            const { min, max, options } = filter;
            let { key } = filter;

            const filterDef = model.filters.find(f => f.key === key);
            // Update key if is a timestep filter
            key = filterDef.timestep ? key + year : key;

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
          db.raw(`
            SUM(
              (summary->>'${summaryKeys.investmentCost}')::numeric
            ) as "investmentCost",
            SUM(
              (summary->>'${summaryKeys.newCapacity}')::numeric
            ) as "newCapacity",
            SUM(
              (summary->>'${summaryKeys.population}')::numeric
            ) as "population"
          `)
        )
        .first()
        .where(whereBuilder)
        .from('scenarios');

      summary.investmentCost = _.round(summary.investmentCost, 2);
      summary.newCapacity = _.round(summary.newCapacity, 2);
      summary.population = _.round(summary.population, 2);

      // Get features
      const features = await db
        .select(
          'featureId as id',
          db.raw(
            `summary->>'${
              summaryKeys.electrificationTech
            }' as "electrificationTech"`
          ),
          db.raw(
            `summary->>'${summaryKeys.investmentCost}' as "investmentCost"`
          ),
          db.raw(`summary->>'${summaryKeys.newCapacity}' as "newCapacity"`),
          db.raw(
            `summary->>'${
              summaryKeys.population
            }' as "population"`
          )
        )
        .where(whereBuilder)
        .orderBy('featureId')
        .from('scenarios');

      const summaryByType = {
        population: {},
        investmentCost: {},
        newCapacity: {}
      };

      // Organize features into layers and calculate summary by type
      let featureTypes = [];
      for (const f of features) {
        featureTypes[f.id] = f.electrificationTech;

        summaryByType.population[f.electrificationTech] =
          (summaryByType.population[f.electrificationTech] || 0) +
          parseFloat(f.population);
        summaryByType.investmentCost[f.electrificationTech] =
          (summaryByType.investmentCost[f.electrificationTech] || 0) +
          parseFloat(f.investmentCost);
        summaryByType.newCapacity[f.electrificationTech] =
          (summaryByType.newCapacity[f.electrificationTech] || 0) +
          parseFloat(f.newCapacity);
      }

      featureTypes = featureTypes.toString();

      const response = { id, featureTypes, summary, summaryByType };

      // Store on redis.
      if (process.env.NODE_ENV !== 'test') {
        await rset(cacheKey, JSON.stringify(response), 'EX', redisCacheTtl);
      }
      return response;
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

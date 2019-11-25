const config = require('config');
const boom = require('boom');
const Hapi = require('@hapi/hapi');
const Joi = require('joi');
const db = require('./db');
const { delay } = require('./utils');
const getScenario = require('./services/get-scenario');

const riseIndicatorsData = require('./rise-indicators.json');

// Get Redis config
const cache = config.get('cache');
const { cacheTtl } = config.get('redisConnection');

// Create cache client only if Redis is available
let redisClient;
if (cache.enabled) {
  redisClient = require('./redis-client');
}

// Start server
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
        .join('countries', 'models.country', '=', 'countries.id')
        .orderBy('countries.name', 'ASC');

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
      }

      country.models = await db
        .select(
          'attribution',
          'country',
          'description',
          'filters',
          'baseYear',
          'timesteps',
          'id',
          'levers',
          'map',
          'name',
          'version',
          'type',
          'sourceData',
          db.raw('to_char("updatedAt", \'YYYY-MM-DD\') as "updatedAt"')
        )
        .from('models')
        .where('country', countryId)
        .orderBy('updatedAt', 'DESC');

      // Search for a riseIndicator
      const riseScores = riseIndicatorsData.find(o => o.iso === countryId);
      country.riseScores = riseScores ? riseScores.data : null;

      return country;
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
          'baseYear',
          'timesteps',
          'filters',
          'id',
          'levers',
          'map',
          'name',
          'type',
          'version',
          'sourceData',
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
          db.raw(`
            (summary->>'${'Pop' + year}')::numeric *
            (summary->>'${'ElecStatusIn' + year}')::numeric
            as "peopleConnected"
          `)
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
      const { query } = request;

      // If cache is not enabled, run query synchronously and return results
      if (!cache.enabled) {
        return await getScenario(id, query);
      }

      // Generate cache key from query params
      const cacheKey = JSON.stringify({ id, query });

      // Load cache entry
      let cachedData = await redisClient.getObject(cacheKey);

      // If no cache entry exists, start query in "background"
      if (!cachedData) {
        getScenario(id, query);
      }

      // If there is no query lock, return cached results
      if (cachedData && !cachedData.runningDbQuery) {
        // Renew cache expiration time
        redisClient.expire(cacheKey, cacheTtl);
        return cachedData;
      }

      // Query is running, start observing cache key for query completion
      let requestDuration = 0;
      const cacheCheckInterval = 1000; // 1 s
      do {
        // Wait 1 second
        await delay(cacheCheckInterval);
        requestDuration = requestDuration + cacheCheckInterval;

        // Check for load timeout
        if (requestDuration > cache.loadTimeout) {
          return boom.gatewayTimeout();
        }

        // Get cached data
        cachedData = await redisClient.getObject(cacheKey);
      } while (cachedData.runningDbQuery);

      // Renew cache expiration time
      redisClient.expire(cacheKey, cacheTtl);

      // Return results
      return cachedData;
    } catch (error) {
      // Malformed queries
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

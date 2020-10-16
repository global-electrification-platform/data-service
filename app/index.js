const config = require('config');
const _ = require('lodash');
const qs = require('qs');
const boom = require('boom');
const Hapi = require('@hapi/hapi');
const Joi = require('joi');
const pako = require('pako');

const db = require('./db');
const riseIndicatorsData = require('./rise-indicators.json');

// Get Redis config
const redisEnabled = config.get('redisEnabled');

// If Redis is enabled, load client and connect
let redis;
let redisCacheTtl;
if (redisEnabled) {
  redis = require('./redis');
  redisCacheTtl = config.get('redisConnection').cacheTtl;
}

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
          'disclaimer',
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
          'disclaimer',
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
      const modelId = id.substring(0, id.lastIndexOf('-'));
      let filters;

      // Parse query string if available
      let { query } = request;
      let targetYear = null;

      // Check for redis data with this query.
      const cacheKey = JSON.stringify({ id, query });
      if (redisEnabled) {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          // Once the data is requested, store for a week
          await redis.expire(cacheKey, redisCacheTtl);

          // Inflate stored JSON string
          const decompressed = pako.inflate(cachedData, { to: 'string' });

          // Parse string into JSON
          return JSON.parse(decompressed);
        }
      }

      if (query) {
        query = qs.parse(query);
        targetYear = parseInt(query.year) || null;

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
        .select('filters', 'timesteps', 'baseYear')
        .where('id', modelId)
        .first();

      const { baseYear } = model;
      let [intermediateYear, finalYear] = model.timesteps;

      // Validate timestep model
      if (model.timesteps) {
        // Set the year to the 1st value if null
        targetYear = targetYear || model.timesteps[0];
        if (model.timesteps.indexOf(targetYear) === -1) {
          throw new SyntaxError(
            `The "year" parameter [${targetYear}] is invalid for this scenario. Must be one of [${model.timesteps.join(
              ', '
            )}]`
          );
        }
      } else {
        // Disregard year
        targetYear = '';
      }

      // Get steps before the target year. This is used to calculate accumulated
      // investment costs
      const includedSteps = model.timesteps.filter(y => y <= targetYear);
      const investmentCostSelector = includedSteps
        .map(year => {
          return `(summary->>'InvestmentCost${year}')::numeric * (summary->>'ElecStatusIn${year}')::numeric`;
        })
        .join(' + ');

      // Assemble summary keys based on year numbers
      const summaryKeys = {
        popBaseYear: 'Pop' + baseYear,
        popIntermediateYear: 'Pop' + intermediateYear,
        popFinalYear: 'Pop' + finalYear,
        popConnectedBaseYear: 'PopConnected' + baseYear,

        elecStatusIntermediateYear: 'ElecStatusIn' + intermediateYear,
        elecStatusFinalYear: 'ElecStatusIn' + finalYear,

        elecTypeBaseYear: 'ElecCode' + baseYear,
        elecTypeIntermediateYear: 'FinalElecCode' + intermediateYear,
        elecTypeFinalYear: 'FinalElecCode' + finalYear,

        electrificationTech: 'FinalElecCode' + targetYear,
        newCapacity: 'NewCapacity' + targetYear,
        electrificationStatus: 'ElecStatusIn' + targetYear
      };

      const whereBuilder = builder => {
        builder.where('scenarioId', id);

        if (filters) {
          filters.forEach(filter => {
            const { min, max, options } = filter;
            let { key } = filter;

            const filterDef = model.filters.find(f => f.key === key);
            // Update key if is a timestep filter
            key = filterDef.timestep ? key + targetYear : key;

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

      // Get summary for filtered clusters
      const summary = await db
        .select(
          db.raw(`
            SUM(
              (summary->>'${summaryKeys.popBaseYear}')::numeric
            ) as "popBaseYear",
            SUM(
              (summary->>'${summaryKeys.popIntermediateYear}')::numeric
            ) as "popIntermediateYear",
            SUM(
              (summary->>'${summaryKeys.popFinalYear}')::numeric
              ) as "popFinalYear"
          `),
          db.raw(`
            SUM(${investmentCostSelector}) as "investmentCost"
          `),
          db.raw(`
            SUM(
              (summary->>'${summaryKeys.newCapacity}')::numeric
            ) as "newCapacity"
          `)
        )
        .first()
        .where(whereBuilder)
        .from('scenarios');

      // Parse query results into a 2 decimals number
      Object.keys(summary).forEach(key => {
        summary[key] = _.round(summary[key], 2);
      });

      // accumulate Investment Cost per year of before target year
      const investmentCostSelectorPerYear = includedSteps
        .map(year => {
          return `(summary->>'InvestmentCost${year}')::numeric * (summary->>'ElecStatusIn${year}')::numeric as "InvestmentCost${year}"`
        })
        .join(',');

      // Get final elec code per year
      const finalElecCodePerYear = includedSteps
        .map(year => {
          return `(summary->>'FinalElecCode${year}')::numeric as "FinalElecCode${year}"`
        })
        .join(',');

      // Get features
      const features = await db
        .select(
          'featureId as id',
          db.raw(
            `summary->>'${summaryKeys.popConnectedBaseYear}' as "popConnectedBaseYear"`
          ),
          db.raw(
            `(summary->>'${summaryKeys.popIntermediateYear}')::numeric * (summary->>'${summaryKeys.elecStatusIntermediateYear}')::numeric as "popConnectedIntermediateYear"`
          ),
          db.raw(
            `(summary->>'${summaryKeys.popFinalYear}')::numeric * (summary->>'${summaryKeys.elecStatusFinalYear}')::numeric as "popConnectedFinalYear"`
          ),
          db.raw(
            `summary->>'${summaryKeys.elecTypeBaseYear}' as "elecTypeBaseYear"`
          ),
          db.raw(
            `summary->>'${summaryKeys.elecTypeIntermediateYear}' as "elecTypeIntermediateYear"`
          ),
          db.raw(
            `summary->>'${summaryKeys.elecTypeFinalYear}' as "elecTypeFinalYear"`
          ),
          db.raw(
            `summary->>'${summaryKeys.electrificationTech}' as "electrificationTech"`
          ),
          db.raw(`(${investmentCostSelector}) as "investmentCost"`),
          db.raw(`summary->>'${summaryKeys.newCapacity}' as "newCapacity"`),
          db.raw(
            `summary->>'${summaryKeys.electrificationStatus}' as "electrificationStatus"`

          ),
          db.raw(investmentCostSelectorPerYear),
          db.raw(finalElecCodePerYear),
        )
        .where(whereBuilder)
        .orderBy('featureId')
        .from('scenarios');

      const summaryByType = {
        popConnectedBaseYear: {},
        popConnectedIntermediateYear: {},
        popConnectedFinalYear: {},
        investmentCost: {},
        newCapacity: {}
      };

      // Organize features into layers and calculate summary by type
      let featureTypes = [];
      for (const f of features) {
        featureTypes[f.id] = f.electrificationTech;

        // Base year, discard null electrification type
        if (f.elecTypeBaseYear) {
          summaryByType.popConnectedBaseYear[f.elecTypeBaseYear] =
            (summaryByType.popConnectedBaseYear[f.elecTypeBaseYear] || 0) +
            parseFloat(f.popConnectedBaseYear);
        }

        // Intermediate year
        if (f.elecTypeIntermediateYear) {
          summaryByType.popConnectedIntermediateYear[f.elecTypeIntermediateYear] =
            (summaryByType.popConnectedIntermediateYear[f.elecTypeIntermediateYear] ||
              0) + parseFloat(f.popConnectedIntermediateYear);
        }

        // Final year
        if (f.elecTypeFinalYear) {
          summaryByType.popConnectedFinalYear[f.elecTypeFinalYear] =
            (summaryByType.popConnectedFinalYear[f.elecTypeFinalYear] || 0) +
            parseFloat(f.popConnectedFinalYear);
        }

        // investment cost per year
        includedSteps
          .map(year => {
            if (f[`FinalElecCode${year}`] && f[`InvestmentCost${year}`]) {
              summaryByType.investmentCost[f[`FinalElecCode${year}`]] =
                (summaryByType.investmentCost[f[`FinalElecCode${year}`]] || 0) +
                parseFloat(f[`InvestmentCost${year}`]);

            }
          })


        if (f.electrificationTech) {
          // Capacity for the target year
          summaryByType.newCapacity[f.electrificationTech] =
            (summaryByType.newCapacity[f.electrificationTech] || 0) +
            parseFloat(f.newCapacity);
        }
      }

      featureTypes = featureTypes.toString();

      const response = { id, featureTypes, summary, summaryByType };

      if (redisEnabled) {
        // Parse scenario results into JSON string
        const jsonString = JSON.stringify(response);

        // Compress into binary string
        const compressed = pako.deflate(jsonString, {
          to: 'string'
        });

        // Store on redis.
        await redis.set(cacheKey, compressed, 'EX', redisCacheTtl);
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

const config = require('config');
const qs = require('qs');
const db = require('../db');
const _ = require('lodash');

// Create cache client only if Redis is available
// Get Redis config
const cache = config.get('cache');
let redisClient;
if (cache.enabled) {
  redisClient = require('../redis-client');
}

/**
 * Generate a string key for a scenarioId/query pair.
 *
 * @param {string} id Scenario id.
 * @param {string} query Query
 */
function cacheKeyFromQuery (id, query) {
  return JSON.stringify({ id, query });
}

async function prepareQuery (id, querystring) {
  let filters;
  let targetYear;
  const modelId = id.substring(0, id.lastIndexOf('-'));

  if (querystring) {
    let query = qs.parse(querystring);
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

  return {
    id,
    model,
    filters,
    querystring,
    targetYear
  };
}

async function lockQuery (id, querystring) {
  // Generate cache key from query params
  const cacheKey = cacheKeyFromQuery(id, querystring);

  // Set cache flag "runningDbQuery" as true
  if (cache.enabled) {
    await redisClient.setObject(
      cacheKey,
      { runningDbQuery: true },
      cache.loadTimeout
    );
  }
}

async function runQuery ({ id, model, filters, targetYear, querystring }) {
  // Generate cache key from query params
  const cacheKey = cacheKeyFromQuery(id, querystring);

  // Catch errors in query execution
  try {
    const { baseYear } = model;
    let [intermediateYear, finalYear] = model.timesteps;

    // Get steps before the target year. This is used to calculate accumulated
    // investment costs
    const includedSteps = model.timesteps.filter(y => y <= targetYear);
    const investmentCostSelector = includedSteps
      .map(year => {
        return `(summary->>'InvestmentCost${year}')::numeric`;
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
        db.raw(
          `(${investmentCostSelector}) as "investmentCost"`
        ),
        db.raw(`summary->>'${summaryKeys.newCapacity}' as "newCapacity"`),
        db.raw(
          `summary->>'${summaryKeys.electrificationStatus}' as "electrificationStatus"`
        )
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

      if (f.electrificationTech) {
      // Investment for the target year
        summaryByType.investmentCost[f.electrificationTech] =
        (summaryByType.investmentCost[f.electrificationTech] || 0) +
        parseFloat(f.investmentCost);

        // Capacity for the target year
        summaryByType.newCapacity[f.electrificationTech] =
        (summaryByType.newCapacity[f.electrificationTech] || 0) +
        parseFloat(f.newCapacity);
      }
    }

    featureTypes = featureTypes.toString();

    const response = { id, featureTypes, summary, summaryByType };

    // Cache query results
    if (cache.enabled) {
      redisClient.setObject(cacheKey, response);
    }

    return response;
  } catch (error) {
    // Query has failed, disable cache lock
    if (cache.enabled) {
      await redisClient.del(cacheKey);
    } else {
      // Pass error forward as query was called synchronously.
      throw error;
    }
  }
}

module.exports = {
  cacheKeyFromQuery,
  prepareQuery,
  lockQuery,
  runQuery
};

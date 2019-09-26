const Joi = require('joi');

// Helpers
const reqNumOrString = Joi.alternatives()
  .try(Joi.number(), Joi.string())
  .required();

const reqString = Joi.string().required();
const arrayOf = o => Joi.array().items(o);

// Schemas
const leverDef = Joi.object({
  id: reqNumOrString,
  label: reqString,
  description: reqString,
  options: arrayOf(
    Joi.object({
      id: reqNumOrString,
      value: reqNumOrString
    })
  ).required()
});

const filterDef = Joi.object({
  id: reqNumOrString,
  key: reqString,
  label: reqString,
  timestep: Joi.boolean(),
  type: Joi.allow('range', 'options').required(),
  options: Joi.when('type', {
    is: 'options',
    then: arrayOf(
      Joi.object({
        id: reqNumOrString,
        value: reqNumOrString,
        label: reqString
      })
    ).required(),
    otherwise: Joi.forbidden()
  })
});

const techLayerDef = Joi.object({
  id: reqNumOrString,
  label: reqString,
  color: reqString
});

const mapLayerDef = Joi.object({
  id: reqNumOrString,
  label: reqString,
  description: reqString,
  type: Joi.allow('raster', 'vector').required(),
  source: Joi.object({
    label: reqString,
    url: Joi.string()
      .uri()
      .required()
  }),
  vectorLayers: Joi.when('type', {
    is: 'vector',
    then: arrayOf(Joi.string()).required(),
    otherwise: Joi.forbidden()
  }),
  tiles: arrayOf(Joi.string()),
  url: Joi.string()
}).xor('tiles', 'url');

module.exports = Joi.object({
  id: reqString,
  name: reqString,
  updatedAt: Joi.date().required(),
  version: reqString,
  type: reqString,
  country: Joi.string()
    .length(2)
    .required(),
  baseYear: Joi.number(),
  timesteps: arrayOf(Joi.number()),
  sourceData: Joi.object({
    clusters: Joi.string().uri().allow(null).required(),
    scenarios: Joi.string().uri().allow(null).required()
  }).required(),
  attribution: Joi.object({
    author: reqString,
    url: Joi.string()
      .uri()
      .required()
  }).required(),
  description: reqString,
  levers: arrayOf(leverDef).required(),
  filters: arrayOf(filterDef).required(),
  map: Joi.object({
    modelVT: Joi.object({
      id: reqString,
      url: reqString
    }).required(),
    externalLayers: arrayOf(mapLayerDef),
    techLayersConfig: arrayOf(techLayerDef)
  }).required()
});

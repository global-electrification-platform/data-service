// Note: using module.exports because this file is included directly in tests.

// This file contains the default config for the tech layers.
// The user will be able to override this in the model.

const namedColors = {
  'grid-ext': '#893831',
  'stdl-diesel': '#fe5931',
  'stdl-photovoltaic': '#ffc700',
  'mini-diesel': '#8fb722',
  'mini-photovoltaic': '#1ea896',
  'mini-wind': '#00a2ce',
  'mini-hydro': '#19647e'
};

const defaultTechLayerConfig = [
  {
    id: '1',
    label: 'Grid extension',
    color: namedColors['grid-ext']
  },
  {
    id: '2',
    label: 'Stand-alone - Diesel',
    color: namedColors['stdl-diesel']
  },
  {
    id: '3',
    label: 'Stand-alone - Photovoltaic',
    color: namedColors['stdl-photovoltaic']
  },
  {
    id: '4',
    label: 'Mini-grid - Diesel',
    color: namedColors['mini-diesel']
  },
  {
    id: '5',
    label: 'Mini-grid - Photovoltaic',
    color: namedColors['mini-photovoltaic']
  },
  {
    id: '6',
    label: 'Mini-grid - Wind',
    color: namedColors['mini-wind']
  },
  {
    id: '7',
    label: 'Mini-grid - Hydro',
    color: namedColors['mini-hydro']
  }
];

function resolveColor (color) {
  if (color.startsWith('#')) return color;
  const colors = Object.keys(namedColors);
  const name = colors[colors.indexOf(color)];
  if (!name) {
    throw new Error(`Named color [${color}] not found`);
  }
  return namedColors[name];
}

function reconcileTechLayers (techLayers = []) {
  let techLayerConfig = Object.assign([], defaultTechLayerConfig);
  return techLayers.reduce((layers, newLayer) => {
    if (newLayer.id === undefined) return layers;

    const layerIdx = layers.findIndex(o => o.id === newLayer.id.toString());
    if (layerIdx !== -1) {
      // Layer exists. Override properties.
      const layer = layers[layerIdx];
      return Object.assign([], layers, { [layerIdx]: {
        id: layer.id.toString(),
        label: newLayer.label || layer.label,
        color: resolveColor(newLayer.color || layer.color)
      } });
    } else {
      // Layer does not exist. Add if al properties exist.
      const missing = ['label', 'color'].filter(p => !newLayer[p]);
      if (missing.length) {
        throw new Error(`Layer definition with id [${newLayer.id}] is missing properties [${missing.join(', ')}]`);
      }

      return layers.concat({
        id: newLayer.id.toString(),
        label: newLayer.label,
        color: resolveColor(newLayer.color)
      });
    }
  }, techLayerConfig);
}

module.exports = {
  namedColors,
  defaultTechLayerConfig,
  resolveColor,
  reconcileTechLayers
};

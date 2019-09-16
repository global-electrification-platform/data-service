const assert = require('assert');
const { resolveColor, reconcileTechLayers, defaultTechLayerConfig } = require('../app/tech-layers-config');

describe('Tech-layers functions', function () {
  describe('colors', function () {
    it('should resolve the named colors correctly', function () {
      // Existing colors.
      assert.strictEqual(resolveColor('grid-ext'), '#73B2FF');
      assert.strictEqual(resolveColor('stdl-diesel'), '#fe5931');
      assert.strictEqual(resolveColor('stdl-photovoltaic'), '#FFD38C');
      assert.strictEqual(resolveColor('mini-diesel'), '#8fb722');
      assert.strictEqual(resolveColor('mini-photovoltaic'), '#E6AF00');
      assert.strictEqual(resolveColor('mini-wind'), '#8F77AD');
      assert.strictEqual(resolveColor('mini-hydro'), '#00518E');
    });

    it('should throw error for non existent named colors', function () {
      // Non existent.
      assert.throws(() => resolveColor('not-a-color'), /Named color \[not-a-color\] not found/);
      assert.throws(() => resolveColor('pink'), /Named color \[pink\] not found/);
    });

    it('should resolve hex colors', function () {
      // Hex color.
      assert.strictEqual(resolveColor('#ff00ff'), '#ff00ff');
      assert.strictEqual(resolveColor('#000000'), '#000000');
    });
  });

  describe('layers', function () {
    it('should return the default layers when none provided', function () {
      assert.deepStrictEqual(reconcileTechLayers(), defaultTechLayerConfig);
    });

    it('should throw error when adding layer with missing properties', function () {
      assert.throws(() => reconcileTechLayers([{
        id: 100
        // Missing label and color
      }]), /Layer definition with id \[100\] is missing properties \[label, color\]/);
      assert.throws(() => reconcileTechLayers([{
        id: 100,
        label: 'A label'
        // Missing color
      }]), /Layer definition with id \[100\] is missing properties \[color\]/);
      assert.throws(() => reconcileTechLayers([{
        id: 100,
        color: '#ff0000'
        // Missing label
      }]), /Layer definition with id \[100\] is missing properties \[label\]/);
    });

    it('should reconcile layers', function () {
      const expected = [
        {
          id: '1',
          label: 'Grid',
          color: '#73B2FF'
        },
        {
          id: '2',
          label: 'Stand-alone - Diesel',
          color: '#000000'
        },
        {
          id: '3',
          label: 'New label for 3',
          color: '#FFD38C'
        },
        {
          id: '4',
          label: 'New label for 4',
          color: '#73B2FF'
        },
        {
          id: '5',
          label: 'Mini-grid - Photovoltaic',
          color: '#E6AF00'
        },
        {
          id: '6',
          label: 'Mini-grid - Wind',
          color: '#8F77AD'
        },
        {
          id: '7',
          label: 'Mini-grid - Hydro',
          color: '#00518E'
        },
        {
          id: '10',
          label: 'A new layer',
          color: '#ff00ff'
        },
        {
          id: '11',
          label: 'A new layer with named color',
          color: '#73B2FF'
        }
      ];

      const newLayers = [
        {
          label: 'no id - will be discarded'
        },
        {
          id: 1
          // There are no properties to override
        },
        {
          id: 2,
          // Only override color.
          color: '#000000'
        },
        {
          id: 3,
          label: 'New label for 3'
        },
        {
          id: 4,
          label: 'New label for 4',
          color: 'grid-ext'
        },
        {
          id: 5,
          prop: 'a property that doesnt matter and wont show up'
        },
        {
          id: 10,
          label: 'A new layer',
          color: '#ff00ff'
        },
        {
          id: 11,
          label: 'A new layer with named color',
          color: 'grid-ext'
        }
      ];
      assert.deepStrictEqual(reconcileTechLayers(newLayers), expected);
    });
  });
});

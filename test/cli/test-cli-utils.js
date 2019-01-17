const assert = require('assert');
const path = require('path');

const { validateDirPath } = require('../../cli/utils');

describe('Utils related functions', function () {
  describe('validateDirPath', function () {
    it('Throw userError when path is invalid', async function () {
      try {
        await validateDirPath('invalid-path');
      } catch (error) {
        const msgs = error.details;
        assert.ok(error.userError);
        assert.deepStrictEqual(msgs, [
          'No files or directories found at invalid-path',
          ''
        ]);
        return;
      }

      // Failsafe.
      assert.fail('Error not thrown');
    });

    it('Throw userError when path is a file', async function () {
      try {
        await validateDirPath(path.join(__dirname, 'yml-files/1.yml'));
      } catch (error) {
        // Exclude the path suggestion from the messages.
        const msgs = error.details.filter((o, idx) => idx !== 3);
        assert.ok(error.userError);

        assert.deepStrictEqual(msgs, [
          '',
          'Source path must be a directory. Try running with the following instead:',
          '',
          // Path suggestion would be here.
          ''
        ]);
        return;
      }

      // Failsafe.
      assert.fail('Error not thrown');
    });

    it('Return when path is valid', async function () {
      try {
        await validateDirPath(path.join(__dirname, 'yml-files'));
      } catch (error) {
        assert.fail(error);
      }
    });
  });
});

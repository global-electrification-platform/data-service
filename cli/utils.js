const fs = require('fs-extra');
const path = require('path');
const { table, getBorderCharacters } = require('table');

/**
 * Alias of console.log
 */
function print (...params) {
  console.log(...params); // eslint-disable-line
}

/**
 * Creates a User Error object.
 * Each error has a details array where each entry is a message line to
 * be printed.
 * The error is supposed to bubble up the chain and print the cli help if
 * the option is enabled.
 * The `userError` property can be used to know if the error is created
 * on purpose rather than thrown by something else.
 *
 * @param {array} details The message lines
 * @param {bool} hideHelp Whether or not to hide the cli help.
 *
 * @returns Error
 */
function userError (details = [], hideHelp = false) {
  const err = new Error('User error');
  err.userError = true;
  err.hideHelp = hideHelp;
  err.details = details;
  return err;
}

/**
 * Displays a table with a minimalistic style.
 *
 * @param {array} rows Table rows
 * @param {number} margin Left margin
 *
 * @returns String
 */
function outputMiniTable (rows, margin = 0) {
  return table(rows, {
    border: getBorderCharacters('void'),
    columnDefault: {
      paddingLeft: 0,
      paddingRight: 3
    },
    columns: {
      0: {
        paddingLeft: margin
      }
    },
    drawHorizontalLine: () => false
  });
}

let timers = {};

/**
 * Like console.time but better. Instead of printing the value returns it.
 * Displays 1h 10m 10s notation for times above 60 seconds.
 * Uses a global timers variable to keep track of timers.
 * On the first call sets the time, on the second returns the value
 *
 * @param {string} name Timer name
 */
function time (name) {
  const t = timers[name];
  if (t) {
    let elapsed = Date.now() - t;
    if (elapsed < 1000) return `${elapsed}ms`;
    if (elapsed < 60 * 1000) return `${elapsed / 1000}s`;

    elapsed /= 1000;
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = Math.floor((elapsed % 3600) % 60);

    delete timers[name];

    return `${h}h ${m}m ${s}s`;
  } else {
    timers[name] = Date.now();
  }
}

/**
 * Validates that the given path is a directory, throwing user erros
 * in other cases.
 *
 * @param {string} dirPath Path to validate
 *
 * @see userError()
 * @throws Error if validation fails
 */
async function validateDirPath (dirPath) {
  try {
    const stats = await fs.lstat(dirPath);
    if (!stats.isDirectory()) {
      const args = process.argv.reduce((acc, o, idx) => {
        // Discard the first 2 arguments.
        if (idx < 1) return acc;
        if (o === dirPath) return acc.concat(path.dirname(dirPath));
        return acc.concat(o);
      }, []);

      throw userError([
        '',
        'Source path must be a directory. Try running with the following instead:',
        '',
        `  node ${args.join(' ')}`,
        ''
      ], true);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw userError([
        'No files or directories found at ' + dirPath,
        ''
      ], true);
    }

    throw error;
  }
}

module.exports = {
  print,
  userError,
  outputMiniTable,
  time,
  validateDirPath
};

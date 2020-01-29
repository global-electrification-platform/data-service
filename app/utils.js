/**
 * Small delay function using Promises.
 *
 * @param {integer} interval Number of milliseconds to wait before resuming.
 */
const delay = function (interval) {
  return new Promise(function (resolve) {
    setTimeout(resolve, interval);
  });
};

module.exports = {
  delay
};

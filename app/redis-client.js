const redis = require('redis');
const config = require('config');
const util = require('util');
const pako = require('pako');

const { host, port, cacheTtl } = config.get('redisConnection');

// Create client instance
const redisClient = redis.createClient({ host, port, no_ready_check: true });

// Log errors
redisClient.on('error', err => {
  console.log('Redis error:', err); // eslint-disable-line
});

// Log client connection
redisClient.on('connect', () => {
  console.log('Redis connected'); // eslint-disable-line
});

/**
 * Set a timeout on key. After the timeout has expired, the key will
 * automatically be deleted. Promisified version of redis.expire.
 *
 * @param {string} key Redis entry key.
 * @param {integer} ttl Time to live is seconds.
 */
const expire = util.promisify(redisClient.expire).bind(redisClient);

/**
 * Get JSON object store in Redis cache
 *
 * @param {string} key Redis entry key.
 */
const set = util.promisify(redisClient.set).bind(redisClient);
async function getObject (key) {
  // Load data from cache key
  const cacheData = await get(key);

  if (cacheData) {
    // Expand and parse into JSON object, if it exists
    const jsonString = pako.inflate(cacheData, { to: 'string' });
    return JSON.parse(jsonString);
  } else {
    return null;
  }
}

/**
 * Store JSON Object in Redis cache
 *
 * @param {string} key Redis entry key.
 * @param {object} object JSON Object to be stored.
 */
const get = util.promisify(redisClient.get).bind(redisClient);
async function setObject (key, object) {
  const jsonString = JSON.stringify(object);

  // Compress into binary string
  const cacheData = pako.deflate(jsonString, { to: 'string' });

  // Store and set TTL
  await set(key, cacheData, 'EX', cacheTtl);
}

module.exports = {
  setObject,
  getObject,
  expire
};

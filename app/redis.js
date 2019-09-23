
const redis = require('redis');
const config = require('config');
const util = require('util');

const redisConnection = config.get('redisConnection');
const redisClient = redis.createClient(redisConnection);

redisClient.on('error', err => {
  console.log('Redis error:', err); // eslint-disable-line
});
redisClient.on('connect', () => {
  console.log('Redis connected'); // eslint-disable-line
});

const set = util.promisify(redisClient.set).bind(redisClient);
const get = util.promisify(redisClient.get).bind(redisClient);
const expire = util.promisify(redisClient.expire).bind(redisClient);

module.exports = {
  get,
  set,
  expire
};

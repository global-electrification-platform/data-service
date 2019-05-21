
const redis = require('redis');
const config = require('config');
const util = require('util');

const redisConf = config.get('redis');

const redisClient = redis.createClient(redisConf);

redisClient.on('error', err => {
  console.log('Redis error:', err);
});
redisClient.on('connect', () => {
  console.log('Redis connected');
});

const set = util.promisify(redisClient.set).bind(redisClient);
const get = util.promisify(redisClient.get).bind(redisClient);
const expire = util.promisify(redisClient.expire).bind(redisClient);

module.exports = {
  get,
  set,
  expire
};

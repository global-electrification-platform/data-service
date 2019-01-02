async function init () {
  const server = require('./app');
  await server.start();
  console.log(`Server running at: ${server.info.uri}`); // eslint-disable-line
}

init();

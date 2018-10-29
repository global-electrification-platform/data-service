const Hapi = require("hapi");
const db = require('./db');


const server = Hapi.server({
  port: 3000,
  host: "localhost"
});

const init = async () => {
  await server.start();
  console.log(`Server running at: ${server.info.uri}`);
};

// ROUTES

server.route({
  method: 'GET',
  path: '/',
  handler: function (request, h) {

      return 'GEP Data Service';
  }
});
process.on("unhandledRejection", err => {
  console.log(err);
  process.exit(1);
});

init();

module.exports = server;

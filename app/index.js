const boom = require("boom");
const Hapi = require("hapi");
const db = require("./db");

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
  method: "GET",
  path: "/",
  handler: function(request, h) {
    return "GEP Data Service";
  }
});

server.route({
  method: "GET",
  path: "/countries",
  handler: async function(request, h) {
    try {
      const countries = await db
        .select("*")
        .from("countries")
        .orderBy("name");
      return { countries };
    } catch (error) {
      return boom.badImplementation(error);
    }
  }
});

process.on("unhandledRejection", err => {
  console.log(err);
  process.exit(1);
});

init();

module.exports = server;

const { assert } = require("chai");
const request = require("request-promise");

const server = require("../app");

const apiUrl = "http://localhost:3000";

describe("root", function() {
  describe("endpoint /", function() {
    it("should have statusCode 200", function(done) {
      request({
        method: "GET",
        uri: `${apiUrl}/`,
        resolveWithFullResponse: true
      })
        .then(async (res) => {
          assert.equal(res.statusCode, 200, "Status code is 200");
          assert.equal(res.body, "GEP Data Service");
          done();
        })
        .catch(err => {
          done(err);
        });
    });
  });
});

after(()=>{
  server.stop();
})

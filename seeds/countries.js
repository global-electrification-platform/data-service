exports.seed = function(knex, Promise) {
  // Deletes ALL existing entries
  return knex("countries")
    .del()
    .then(function() {
      // Inserts seed entries
      return knex("countries").insert([
        { id: "mw", name: "Malawi" },
        { id: "cg", name: "Congo" },
        { id: "bj", name: "Benin" }
      ]);
    });
};

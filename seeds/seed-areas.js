const { readdirSync } = require('fs');
const { join } = require('path');
const csv = require('fast-csv');

const areasDirPath = join(__dirname, '..', 'fixtures', 'areas');

async function readAreasFile (knex, areaFileName) {
  const areaFilePath = join(areasDirPath, areaFileName);

  return new Promise(function (resolve, reject) {
    const entries = [];

    csv
      .fromPath(areaFilePath, { headers: true })
      .on('data', results => {
        // Convert columns to object properties
        const entry = {
          id: results.id,
          geometry: results.wkt
        };
        entries.push(entry);
      })
      .on('end', async () => {
        // Insert to the database
        await knex('areas')
          .insert(entries);

        resolve();
      })
      .on('error', reject);
  });
}

exports.seed = async function (knex, Promise) {
  await knex('areas').del();
  const areaFiles = readdirSync(areasDirPath);
  return Promise.all(areaFiles.map(file => readAreasFile(knex, file)));
};

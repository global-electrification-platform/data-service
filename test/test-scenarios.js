const { stringify } = require('qs');
const fs = require('fs-extra');
const path = require('path');
const supertest = require('supertest');
const { expect } = require('chai');

/* global server */

describe('Endpoint: /scenarios', function () {
  it('GET /scenarios/mw-1-0_0_0 returns feature types and summary', async function () {
    const scenarioId = 'mw-1-0_0_0';
    const results = await fs.readJson(
      path.join(__dirname, 'expected-scenarios', 'mw-1-0_0_0.json')
    );

    return supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .expect(200)
      .then(({ body }) => {
        const { id, summary, summaryByType, featureTypes } = body;
        expect(Object.keys(body)).to.deep.eq(Object.keys(results));
        expect(id).to.deep.eq(results.id);
        expect(summary).to.deep.eq(results.summary);
        expect(summaryByType).to.deep.eq(results.summaryByType);
        expect(featureTypes).to.deep.eq(results.featureTypes);
      });
  });

  it('GET /scenarios/mw-1-0_0_0 returns feature types and summary for given year', async function () {
    const scenarioId = 'mw-1-0_0_0';
    const results = await fs.readJson(
      path.join(__dirname, 'expected-scenarios', 'mw-1-0_0_0-2030.json')
    );

    return supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .query(stringify({ year: 2030 }))
      .expect(200)
      .then(({ body }) => {
        const { id, summary, summaryByType, featureTypes } = body;
        expect(Object.keys(body)).to.deep.eq(Object.keys(results));
        expect(id).to.deep.eq(results.id);
        expect(summary).to.deep.eq(results.summary);
        expect(summaryByType).to.deep.eq(results.summaryByType);
        expect(featureTypes).to.deep.eq(results.featureTypes);
      });
  });

  it('GET /scenarios/mw-1-0_0_0 with malformed year return default', async function () {
    const scenarioId = 'mw-1-0_0_0';
    const results = await fs.readJson(
      path.join(__dirname, 'expected-scenarios', 'mw-1-0_0_0.json')
    );

    await supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .query(
        stringify({
          year: 'not-a-year'
        })
      )
      .expect(200, results);
  });

  it('GET /scenarios/mw-1-0_0_0 with non-existent year return error', async function () {
    const scenarioId = 'mw-1-0_0_0';

    await supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .query(
        stringify({
          year: 1900 // not available
        })
      )
      .expect(400);
  });

  it('GET /scenarios/mw-1-0_0_0 with malformed range filter return error', async function () {
    const scenarioId = 'mw-1-0_0_0';

    // Not an Array
    await supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .query(stringify({ filters: { SubstationDist: 500 } }))
      .expect(400);

    // Range without a key
    await supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .query(
        stringify({
          filters: [{ notKey: 'SubstationDist', min: 1000 }]
        })
      )
      .expect(400);

    // Range without min or max values
    await supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .query(
        stringify({
          filters: [{ key: 'SubstationDist', otherValue: 100 }]
        })
      )
      .expect(400);
  });

  it('GET /scenarios/mw-1-0_0_0 with filtering by a minimum value', async function () {
    const scenarioId = 'mw-1-0_0_0';
    const filters = [{ key: 'SubstationDist', min: 95, max: 110 }];
    const results = await fs.readJson(
      path.join(
        __dirname,
        'expected-scenarios',
        'mw-1-0_0_0-substationdist.json'
      )
    );

    await supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .query(stringify({ filters, year: 2030 }))
      .expect(200)
      .then(({ body }) => {
        const { id, summary, summaryByType, featureTypes } = body;
        expect(Object.keys(body)).to.deep.eq(Object.keys(results));
        expect(id).to.deep.eq(results.id);
        expect(summary).to.deep.eq(results.summary);
        expect(summaryByType).to.deep.eq(results.summaryByType);
        expect(featureTypes).to.deep.eq(results.featureTypes);
      });
  });

  it('GET /scenarios/mw-1-0_0_0, filtering by one option', async function () {
    const scenarioId = 'mw-1-0_0_0';
    const filters = [{ key: 'FinalElecCode', options: ['1'] }];
    const results = await fs.readJson(
      path.join(
        __dirname,
        'expected-scenarios',
        'mw-1-0_0_0-finalelecode-1.json'
      )
    );

    await supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .query(stringify({ filters, year: 2030 }))
      .expect(200)
      .then(({ body }) => {
        const { id, summary, summaryByType, featureTypes } = body;
        expect(Object.keys(body)).to.deep.eq(Object.keys(results));
        expect(id).to.deep.eq(results.id);
        expect(summary).to.deep.eq(results.summary);
        expect(summaryByType).to.deep.eq(results.summaryByType);
        expect(featureTypes).to.deep.eq(results.featureTypes);
      });
  });

  it('GET /scenarios/mw-1-0_0_0, filtering by two options', async function () {
    const scenarioId = 'mw-1-0_0_0';
    const filters = [{ key: 'FinalElecCode', options: ['2', '3'] }];
    const results = await fs.readJson(
      path.join(
        __dirname,
        'expected-scenarios',
        'mw-1-0_0_0-finalelecode-2-3.json'
      )
    );

    await supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .query(stringify({ filters, year: 2030 }))
      .expect(200)
      .then(({ body }) => {
        const { id, summary, summaryByType, featureTypes } = body;
        expect(Object.keys(body)).to.deep.eq(Object.keys(results));
        expect(id).to.deep.eq(results.id);
        expect(summary).to.deep.eq(results.summary);
        expect(summaryByType).to.deep.eq(results.summaryByType);
        expect(featureTypes).to.deep.eq(results.featureTypes);
      });
  });

  it('GET /scenarios/mw-1-0_0_0, filtering by options AND range', async function () {
    const scenarioId = 'mw-1-0_0_0';
    const filters = [
      { key: 'FinalElecCode', options: ['1', '5'] },
      { key: 'Pop', min: 30, max: 150 }
    ];
    const results = await fs.readJson(
      path.join(
        __dirname,
        'expected-scenarios',
        'mw-1-0_0_0-finalelecode-1-5-pop.json'
      )
    );

    await supertest(server.listener)
      .get(`/scenarios/${scenarioId}`)
      .query(stringify({ filters, year: 2030 }))
      .expect(200)
      .then(({ body }) => {
        const { id, summary, summaryByType, featureTypes } = body;
        expect(Object.keys(body)).to.deep.eq(Object.keys(results));
        expect(id).to.deep.eq(results.id);
        expect(summary).to.deep.eq(results.summary);
        expect(summaryByType).to.deep.eq(results.summaryByType);
        expect(featureTypes).to.deep.eq(results.featureTypes);
      });
  });
});

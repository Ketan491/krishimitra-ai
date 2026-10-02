const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

/**
 * The crop recommendation form was returning HTTP 400 on every submit.
 *
 * GET /api/advisory/options advertises lowercase enums, and
 * POST /api/advisory/recommend validates the body against exactly those lists -
 * but the form was sending 'Alluvial' and 'Kharif'. Two of the soils the form
 * offered ('Alluvial', 'Laterite') were not in the backend enum at all.
 *
 * These tests pin the two halves of that contract to each other: whatever
 * /options advertises must be accepted by /recommend. If someone adds a soil to
 * the enum without teaching the validator, or vice versa, this fails.
 */

const DATA_FILE = require('../config').dataFile;
const app = require('../app');
const { SOIL_TYPES, SEASONS } = require('../knowledge/cropData');

let server;
let baseUrl;

test.before(() => {
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

test.after(() => {
  server.close();
  if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
});

async function api(method, path, body) {
  const res = await fetch(baseUrl + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, body: json };
}

test('every advertised soil type is accepted by the recommend endpoint', async () => {
  const options = await api('GET', '/api/advisory/options');
  assert.equal(options.status, 200);

  for (const soilType of options.body.soilTypes) {
    const res = await api('POST', '/api/advisory/recommend', { soilType, season: 'kharif' });
    assert.equal(res.status, 200, `soilType "${soilType}" was advertised but rejected: ${res.text || JSON.stringify(res.body)}`);
  }
});

test('every advertised season is accepted by the recommend endpoint', async () => {
  const options = await api('GET', '/api/advisory/options');

  for (const season of options.body.seasons) {
    const res = await api('POST', '/api/advisory/recommend', { soilType: 'loamy', season });
    assert.equal(res.status, 200, `season "${season}" was advertised but rejected: ${res.text || JSON.stringify(res.body)}`);
  }
});

test('the advertised options are the ones the validator checks', async () => {
  const options = await api('GET', '/api/advisory/options');
  assert.deepEqual(options.body.soilTypes, SOIL_TYPES);
  assert.deepEqual(options.body.seasons, SEASONS);
});

test('the Title Case values the form used to send are rejected', async () => {
  // Documents why the form had to change rather than the validator: the API is
  // the contract owner, and its knowledge base is keyed on lowercase.
  for (const bad of [
    { soilType: 'Alluvial', season: 'kharif' },
    { soilType: 'Loamy', season: 'Kharif' },
  ]) {
    const res = await api('POST', '/api/advisory/recommend', bad);
    assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(bad)}, got ${res.status}`);
  }
});

test('a recommendation comes back with the crop list attached', async () => {
  const res = await api('POST', '/api/advisory/recommend', { soilType: 'loamy', season: 'kharif' });
  assert.equal(res.status, 200);
  assert.equal(res.body.soilType, 'loamy');
  assert.equal(res.body.season, 'kharif');
  assert.ok(Array.isArray(res.body.recommendations));
});

const test = require('node:test');
const assert = require('node:assert');
const { recommendCrops, SOIL_TYPES, SEASONS } = require('../knowledge/cropData');

test('recommendCrops returns an exact match for a known good combination', () => {
  const { exactMatch, results } = recommendCrops({ soilType: 'clay', season: 'kharif' });
  assert.strictEqual(exactMatch, true);
  assert.ok(results.length > 0, 'should return at least one recommendation');
  assert.ok(results[0].crop, 'each result should have a crop name');
  assert.ok(results[0].guidance.landPrep, 'each result should include land prep guidance');
});

test('recommendCrops falls back gracefully AND flags it honestly for an unmatched combination', () => {
  const { exactMatch, results } = recommendCrops({ soilType: 'red', season: 'zaid' });
  assert.strictEqual(exactMatch, false, "should honestly report this wasn't a real match");
  assert.ok(Array.isArray(results));
  assert.ok(results.length > 0, 'should still return a fallback recommendation, never an empty list');
});

test('recommendCrops never returns more than 3 results', () => {
  const { results } = recommendCrops({ soilType: 'loamy', season: 'kharif' });
  assert.ok(results.length <= 3);
});

test('SOIL_TYPES and SEASONS lookup lists are non-empty (used to validate API input)', () => {
  assert.ok(SOIL_TYPES.length >= 3);
  assert.ok(SEASONS.length >= 3);
});

const test = require('node:test');
const assert = require('node:assert');
const yieldPredictor = require('../ml/yieldPredictor');

test('model trains with a reasonable fit on its own training data (R^2 > 0.8)', () => {
  assert.ok(yieldPredictor.modelInfo.rSquared > 0.8, `R^2 too low: ${yieldPredictor.modelInfo.rSquared}`);
});

test('higher rainfall + fertilizer predicts higher yield per acre (directionally sane)', () => {
  const low = yieldPredictor.predictYield({ rainfall: 350, fertilizer: 20, landSize: 1 });
  const high = yieldPredictor.predictYield({ rainfall: 900, fertilizer: 70, landSize: 1 });
  assert.ok(high > low, `expected high-input prediction (${high}) > low-input prediction (${low})`);
});

test('predictYield never returns a negative value', () => {
  const result = yieldPredictor.predictYield({ rainfall: 0, fertilizer: 0, landSize: 0.1 });
  assert.ok(result >= 0);
});

test('modelInfo discloses that training data is synthetic (academic honesty check)', () => {
  assert.match(yieldPredictor.modelInfo.note.toLowerCase(), /synthetic/);
});

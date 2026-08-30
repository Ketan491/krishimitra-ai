const test = require('node:test');
const assert = require('node:assert');
const { cleanupDb } = require('./lib');

require('./lib');

const { diagnose, DISEASE_RULES } = require('../knowledge/diseaseData');

test.after(cleanupDb);

test('recognises powdery mildew from classic symptoms', () => {
  const r = diagnose({ cropName: 'Grapes', symptoms: 'white powdery patches on leaves' });
  assert.strictEqual(r.diagnosis, 'Powdery Mildew');
  assert.strictEqual(r.exactMatch, true);
  assert.ok(r.management.length > 0);
  assert.match(r.disclaimer, /rule-based demo/);
});

test('recognises fruit borer damage', () => {
  const r = diagnose({ cropName: 'Brinjal', symptoms: 'small holes in fruit with bore marks, shoots drying' });
  assert.strictEqual(r.diagnosis, 'Fruit / Shoot Borer (Lepidoptera)');
  assert.ok(r.urgent === true);
});

test('returns honest low-confidence for vague symptoms', () => {
  const r = diagnose({ cropName: 'Wheat', symptoms: 'things look a bit off lately' });
  assert.strictEqual(r.exactMatch, false);
  assert.match(r.diagnosis, /expert confirmation/i);
  assert.match(r.disclaimer, /KVK/);
});

test('empty symptoms returns a guidance-first result', () => {
  const r = diagnose({ cropName: 'Onion', symptoms: '' });
  assert.strictEqual(r.exactMatch, false);
  assert.match(r.diagnosis, /No symptoms/);
});

test('every rule exposes management guidance (no empty advice)', () => {
  for (const rule of DISEASE_RULES) {
    assert.ok(rule.management.length >= 1, `rule ${rule.name} must have management steps`);
    assert.ok(rule.causes.length >= 1, `rule ${rule.name} must list causes`);
  }
});

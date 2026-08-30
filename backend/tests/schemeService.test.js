const test = require('node:test');
const assert = require('node:assert');
const { cleanupDb } = require('./lib');

require('./lib');

const db = require('../db');
const schemeService = require('../services/schemeService');

test.before(() => {
  const hasPmKisan = db.all('schemes').some((s) => s.name.includes('PM-KISAN'));
  if (!hasPmKisan) {
    db.insert('schemes', {
      name: 'PM-KISAN Samman Nidhi',
      min_land: 0,
      max_land: 5,
      crop: 'any',
      description: 'Test income support scheme.',
    });
  }
});

test.after(cleanupDb);

test('eligibility includes schemes at exact boundaries', () => {
  const eligible = schemeService.eligible(5);
  assert.ok(
    eligible.some((s) => s.name.includes('PM-KISAN')),
    '5 acres (max) should be eligible',
  );
  const over = schemeService.eligible(5.01);
  assert.ok(!over.some((s) => s.name.includes('PM-KISAN')), '5.01 acres should NOT be eligible');
});

test('eligibility rejects invalid land sizes', () => {
  assert.throws(() => schemeService.eligible('abc'), /positive number/);
  assert.throws(() => schemeService.eligible(-1), /positive number/);
});

test('admin-only mutations reject a non-admin caller', () => {
  assert.throws(
    () => schemeService.create({ name: 'X', description: 'placeholder text here' }, { role: 'farmer', id: 1 }),
    /Only admins/,
  );
});

test('create(), update() and remove() are recorded in the audit log', () => {
  const admin = { role: 'admin', id: 1 };
  const created = schemeService.create(
    { name: 'Test Scheme XYZ', min_land: 0, max_land: 10, crop: 'wheat', description: 'A test scheme description.' },
    admin,
    'admin',
  );
  assert.strictEqual(created.name, 'Test Scheme XYZ');

  const updated = schemeService.update(created.id, { max_land: 8 }, admin, 'admin');
  assert.strictEqual(updated.max_land, 8);

  schemeService.remove(created.id, admin, 'admin');
  assert.equal(
    db.find('schemes', (s) => s.id === created.id),
    undefined,
  );

  const audits = db.all('auditLog');
  assert.ok(audits.some((a) => a.action === 'SCHEME_CREATE'));
  assert.ok(audits.some((a) => a.action === 'SCHEME_UPDATE'));
  assert.ok(audits.some((a) => a.action === 'SCHEME_DELETE'));
});

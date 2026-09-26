const test = require('node:test');
const assert = require('node:assert');
const { cleanupDb } = require('./lib');

require('./lib');

const db = require('../db');
const productService = require('../services/productService');
const { inferCategory, resolveCategory, isValidCategory } = require('../knowledge/productCategories');

let farmer;

test.before(() => {
  db.all('products').forEach((p) => db.remove('products', p.id));
  db.all('reviews').forEach((r) => db.remove('reviews', r.id));

  farmer = db.insert('farmers', {
    name: 'Category Farmer',
    mobile: '9999900777',
    passwordHash: 'x',
    location: 'Nashik',
    soilType: 'black',
    landSize: 2,
  });

  const rows = [
    { cropName: 'Wheat', price: 24, quantity: 100 },
    { cropName: 'Onion', price: 22, quantity: 100 },
    { cropName: 'Tomato', price: 18, quantity: 100 },
    { cropName: 'Grapes', price: 65, quantity: 100 },
    { cropName: 'Tur (Pigeon Pea)', price: 7800, quantity: 40, unit: 'quintal' },
  ];
  rows.forEach((r) =>
    db.insert('products', {
      farmerId: farmer.id,
      ...r,
      unit: r.unit || 'kg',
      approved: true,
      createdAt: new Date().toISOString(),
    }),
  );
});

test.after(cleanupDb);

test('inferCategory buckets produce into crops, vegetables and fruits', () => {
  assert.strictEqual(inferCategory('Wheat'), 'crop');
  assert.strictEqual(inferCategory('Sugarcane'), 'crop');
  assert.strictEqual(inferCategory('Groundnut'), 'crop');
  assert.strictEqual(inferCategory('Tur (Pigeon Pea)'), 'crop', 'a pulse must not read as a fruit word');
  assert.strictEqual(inferCategory('Onion'), 'vegetable');
  assert.strictEqual(inferCategory('Tomato (Hybrid)'), 'vegetable', 'free-text suffixes still match');
  assert.strictEqual(inferCategory('Okra (Ladyfinger)'), 'vegetable');
  assert.strictEqual(inferCategory('Grapes'), 'fruit');
  assert.strictEqual(inferCategory('Banana'), 'fruit');
});

test('isValidCategory only accepts the three marketplace shelves', () => {
  assert.ok(isValidCategory('crop'));
  assert.ok(isValidCategory('FRUIT'));
  assert.ok(!isValidCategory('dairy'));
  assert.ok(!isValidCategory(''));
  assert.ok(!isValidCategory(undefined));
});

test('legacy products with no stored category are backfilled on load', () => {
  // The row was inserted without a category, exactly like a pre-migration listing.
  const onion = db.all('products').find((p) => p.cropName === 'Onion');
  assert.strictEqual(onion.category, 'vegetable', 'healProductCategories backfills on read');
  assert.strictEqual(db.all('products').find((p) => p.cropName === 'Grapes').category, 'fruit');
  assert.strictEqual(db.all('products').find((p) => p.cropName === 'Wheat').category, 'crop');
});

test('resolveCategory also works on a raw in-memory row', () => {
  assert.strictEqual(resolveCategory({ cropName: 'Onion' }), 'vegetable');
  assert.strictEqual(resolveCategory({ cropName: 'Mango' }), 'fruit');
  assert.strictEqual(resolveCategory({ cropName: 'Bajra' }), 'crop');
  assert.strictEqual(resolveCategory({ cropName: 'Mango', category: 'fruit' }), 'fruit', 'stored value wins');
  assert.strictEqual(resolveCategory({ cropName: 'Mango', category: 'nonsense' }), 'fruit', 'bad value is re-inferred');
  assert.strictEqual(resolveCategory(null), 'crop');
});

test('publicList filters by category and reports counts per shelf', () => {
  assert.strictEqual(productService.publicList({ category: 'crop' }).total, 2);
  assert.strictEqual(productService.publicList({ category: 'vegetable' }).total, 2);
  assert.strictEqual(productService.publicList({ category: 'fruit' }).total, 1);

  const counts = productService.categoryCounts();
  assert.deepStrictEqual(counts, { crop: 2, vegetable: 2, fruit: 1 });
});

test('publicList combines a category filter with search', () => {
  const result = productService.publicList({ category: 'vegetable', search: 'onion' });
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.items[0].cropName, 'Onion');
  assert.strictEqual(result.items[0].category, 'vegetable');
});

test('an unknown category filter is ignored rather than erroring the whole listing', () => {
  assert.strictEqual(productService.publicList({ category: 'dairy' }).total, 5);
});

test('every listed product carries a category in its response', () => {
  const all = productService.publicList({}).items;
  assert.ok(all.length > 0);
  all.forEach((p) => assert.ok(['crop', 'vegetable', 'fruit'].includes(p.category), `${p.cropName} -> ${p.category}`));
});

test('createFromForm stores the chosen category', () => {
  const owner = { role: 'farmer', id: farmer.id };
  const created = productService.createFromForm(
    { cropName: 'Banana', category: 'fruit', price: 40, quantity: 50, unit: 'kg' },
    null,
    owner,
  );
  assert.strictEqual(created.category, 'fruit');
});

test('createFromForm infers a category when the farmer leaves the field blank', () => {
  const owner = { role: 'farmer', id: farmer.id };
  const created = productService.createFromForm({ cropName: 'Brinjal', price: 25, quantity: 30 }, null, owner);
  assert.strictEqual(created.category, 'vegetable');
});

test('createFromForm rejects an unknown category', () => {
  const owner = { role: 'farmer', id: farmer.id };
  assert.throws(
    () => productService.createFromForm({ cropName: 'Milk', category: 'dairy', price: 20, quantity: 10 }, null, owner),
    (e) => e.status === 400 && /category must be one of/.test(e.message),
  );
});

test('updateById moves a listing between shelves', () => {
  const wheat = productService.publicList({ crop: 'Wheat' }).items[0];
  const owner = { role: 'farmer', id: farmer.id };
  const updated = productService.updateById(wheat.id, { category: 'vegetable' }, null, owner);
  assert.strictEqual(updated.category, 'vegetable');
  assert.strictEqual(productService.publicList({ category: 'vegetable' }).total, 3);
});

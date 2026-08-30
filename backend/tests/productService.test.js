const test = require('node:test');
const assert = require('node:assert');
const { cleanupDb } = require('./lib');

require('./lib');

const db = require('../db');
const productService = require('../services/productService');

test.before(() => {
  db.all('products').forEach((p) => db.remove('products', p.id));
  db.all('reviews').forEach((r) => db.remove('reviews', r.id));

  const farmer = db.insert('farmers', {
    name: 'Seller X',
    mobile: '9999900011',
    passwordHash: 'x',
    location: 'Nashik',
    soilType: 'black',
    landSize: 3,
  });
  const names = [
    { cropName: 'Onion', price: 20, quantity: 100, organic: false, compareToPrice: 25 },
    { cropName: 'Onion', price: 30, quantity: 80, organic: true },
    { cropName: 'Grapes', price: 60, quantity: 90, organic: true },
    { cropName: 'Wheat', price: 25, quantity: 50, organic: false },
  ];
  names.forEach((n) =>
    db.insert('products', {
      farmerId: farmer.id,
      ...n,
      unit: 'kg',
      approved: true,
      createdAt: new Date().toISOString(),
    }),
  );

  db.insert('products', {
    farmerId: farmer.id,
    cropName: 'Hidden',
    price: 1,
    quantity: 5,
    unit: 'kg',
    approved: null,
  });
});

test.after(cleanupDb);

test('publicList shows approved products only', () => {
  const result = productService.publicList({});
  assert.strictEqual(result.total, 4);
  assert.ok(!result.items.some((p) => p.cropName === 'Hidden'));
});

test('publicList filters by crop name and organic flag', () => {
  const onion = productService.publicList({ crop: 'Onion' });
  assert.strictEqual(onion.total, 2);

  const organicOnion = productService.publicList({ crop: 'Onion', organic: 'true' });
  assert.strictEqual(organicOnion.total, 1);
  assert.strictEqual(organicOnion.items[0].price, 30);
});

test('publicList sorts by price ascending/descending', () => {
  const asc = productService.publicList({ sort: 'price_asc' });
  const prices = asc.items.map((p) => p.price);
  assert.deepStrictEqual(
    prices,
    [...prices].sort((a, b) => a - b),
  );

  const desc = productService.publicList({ sort: 'price_desc' });
  const descPrices = desc.items.map((p) => p.price);
  assert.deepStrictEqual(
    descPrices,
    [...descPrices].sort((a, b) => b - a),
  );
});

test('publicList paginates with correct metadata', () => {
  const page1 = productService.publicList({ page: 1, limit: 2 });
  assert.strictEqual(page1.items.length, 2);
  assert.strictEqual(page1.totalPages, 2);
  assert.ok(page1.total >= 4);

  const page2 = productService.publicList({ page: 2, limit: 2 });
  assert.ok(page2.items.length >= 1);
  const ids = new Set([...page1.items, ...page2.items].map((p) => p.id));
  assert.strictEqual(ids.size, 4, 'page 2 must not repeat page 1 items');
});

test('getting a product enriches it with farmer + ratings', () => {
  const onion = productService.publicList({ crop: 'Onion' }).items[0];
  const detail = productService.getById(onion.id);
  assert.strictEqual(detail.farmerName, 'Seller X');
  assert.ok(Array.isArray(detail.reviews));
});

test('updateById rejects edits from a non-owner farmer', () => {
  const product = productService.publicList({ crop: 'Onion' }).items[0];
  const intruder = { role: 'farmer', id: 999 };
  assert.throws(
    () => productService.updateById(product.id, { price: '1' }, null, intruder),
    (e) => e.status === 403,
  );
});

test('priceTrend is deterministic for a given crop', () => {
  const a = productService.priceTrend('Onion');
  const b = productService.priceTrend('Onion');
  assert.deepStrictEqual(
    a.trend.map((t) => t.price),
    b.trend.map((t) => t.price),
  );
  assert.strictEqual(a.trend.length, 14);
  assert.strictEqual(a.unit, 'kg');
});

test('deals expose discountPercent and are sorted by discount', () => {
  const owner = { role: 'farmer', id: db.all('farmers')[0].id };
  const created = productService.createFromForm(
    { cropName: 'Tur', price: 70, quantity: 40, unit: 'kg', compareToPrice: 100 },
    null,
    owner,
  );
  db.update('products', created.id, { approved: true });

  const deals = productService.getDeals();
  assert.ok(deals.length >= 1);
  assert.ok(deals.every((d) => d.discountPercent > 0));
  assert.strictEqual(deals[0].cropName, 'Tur', 'Tur has the highest discount (30%)');
  assert.strictEqual(deals[0].discountPercent, 30);
  assert.strictEqual(deals[0].compareToPrice, 100);

  const byDeal = productService.publicList({ sort: 'deal' });
  assert.strictEqual(byDeal.items[0].cropName, 'Tur');
});

test('createFromForm rejects an MRP below or equal to the selling price', () => {
  const owner = { role: 'farmer', id: db.all('farmers')[0].id };
  assert.throws(
    () => productService.createFromForm({ cropName: 'Rice', price: 50, quantity: 10, compareToPrice: 40 }, null, owner),
    (e) => e.status === 400 && e.message.includes('MRP'),
  );
  assert.throws(
    () => productService.createFromForm({ cropName: 'Rice', price: 50, quantity: 10, compareToPrice: 50 }, null, owner),
    (e) => e.status === 400,
  );
});

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { work } = require('./_support');
const { createCart, addItem } = require('../src/cart');
const { quote } = require('../src/orders');

// Integration tests: exercise cart, discount, shipping, tax and dates together.
// Deliberately the slowest suite, like real end-to-end tests.
const monday = new Date('2026-10-05T12:00:00Z');

describe('orders', () => {
  test('quotes a simple domestic order', async () => {
    await work(600);
    const q = quote(addItem(createCart(), 'ABC-0001', 40, 1), { region: 'US-NY', zone: 'domestic', orderDate: monday });
    assert.deepEqual(q, { items: 40, discounted: 40, shipping: 9, tax: 1.6, total: 50.6, deliverBy: '2026-10-08' });
  });
  test('applies a coupon before tax', async () => {
    await work(700);
    const q = quote(addItem(createCart(), 'ABC-0001', 50, 2), { coupon: 'SAVE10', region: 'US-CA', zone: 'local', orderDate: monday });
    assert.equal(q.discounted, 90);
    assert.equal(q.tax, 6.53);
  });
  test('ships free over $100 domestically', async () => {
    await work(650);
    const q = quote(addItem(createCart(), 'ABC-0001', 60, 2), { region: 'US-OR', zone: 'domestic', orderDate: monday });
    assert.equal(q.shipping, 0);
    assert.equal(q.total, 120);
  });
  test('stacks bulk discount and coupon', async () => {
    await work(800);
    const q = quote(addItem(createCart(), 'ABC-0001', 10, 10), { coupon: 'VIP25', region: 'CA-AB', zone: 'international', orderDate: monday });
    assert.equal(q.discounted, 71.25);
    assert.equal(q.deliverBy, '2026-10-19');
  });
});

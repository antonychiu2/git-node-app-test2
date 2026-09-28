const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { work } = require('./_support');
const { percentOff, applyCoupon, bulkDiscount } = require('../src/discount');

describe('discount', () => {
  test('takes a percentage off', async () => {
    await work(200);
    assert.equal(percentOff(80, 25), 60);
  });
  test('rejects percentages outside 0-100', async () => {
    await work(100);
    assert.throws(() => percentOff(80, 120), RangeError);
  });
  test('applies known coupons case-insensitively', async () => {
    await work(250);
    assert.equal(applyCoupon(100, 'save10'), 90);
    assert.equal(applyCoupon(100, 'VIP25'), 75);
  });
  test('ignores unknown coupons', async () => {
    await work(150);
    assert.equal(applyCoupon(100, 'NOPE'), 100);
  });
  test('applies bulk tiers at 10 and 50 items', async () => {
    await work(300);
    assert.equal(bulkDiscount(100, 9), 100);
    assert.equal(bulkDiscount(100, 10), 95);
    assert.equal(bulkDiscount(100, 50), 90);
  });
});

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { work } = require('./_support');
const { shippingCost, estimateDays } = require('../src/shipping');

describe('shipping', () => {
  test('charges base plus rounded-up kilograms', async () => {
    await work(250);
    assert.equal(shippingCost(2.2, 'domestic'), 11);
  });
  test('is free for domestic orders over $100', async () => {
    await work(200);
    assert.equal(shippingCost(5, 'domestic', 150), 0);
  });
  test('is never free internationally', async () => {
    await work(200);
    assert.equal(shippingCost(1, 'international', 500), 24);
  });
  test('estimates delivery days per zone', async () => {
    await work(150);
    assert.equal(estimateDays('local'), 1);
    assert.equal(estimateDays('international'), 10);
  });
  test('rejects negative weights and unknown zones', async () => {
    await work(150);
    assert.throws(() => shippingCost(-1, 'local'), RangeError);
    assert.throws(() => shippingCost(1, 'mars'), /unknown zone/);
  });
});

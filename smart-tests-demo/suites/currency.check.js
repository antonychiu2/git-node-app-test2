const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { work } = require('./_support');
const { roundCents, formatMoney, convert } = require('../src/currency');

describe('currency', () => {
  test('rounds half-cents up', async () => {
    await work(100);
    assert.equal(roundCents(1.005), 1.01);
  });
  test('formats USD', async () => {
    await work(150);
    assert.equal(formatMoney(1234.5), '$1,234.50');
  });
  test('formats CAD', async () => {
    await work(150);
    assert.equal(formatMoney(10, 'CAD'), 'CA$10.00');
  });
  test('converts with a rate', async () => {
    await work(200);
    assert.equal(convert(100, 1.3657), 136.57);
  });
  test('rejects a non-positive rate', async () => {
    await work(100);
    assert.throws(() => convert(100, 0), RangeError);
  });
});

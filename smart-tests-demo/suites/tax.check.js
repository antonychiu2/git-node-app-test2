const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { work } = require('./_support');
const { taxRate, taxFor, totalWithTax } = require('../src/tax');

describe('tax', () => {
  test('knows regional rates', async () => {
    await work(150);
    assert.equal(taxRate('CA-ON'), 0.13);
  });
  test('computes California sales tax', async () => {
    await work(250);
    assert.equal(taxFor(100, 'US-CA'), 7.25);
  });
  test('Oregon has no sales tax', async () => {
    await work(150);
    assert.equal(totalWithTax(100, 'US-OR'), 100);
  });
  test('adds Ontario HST to the total', async () => {
    await work(250);
    assert.equal(totalWithTax(50, 'CA-ON'), 56.5);
  });
  test('rejects unknown regions', async () => {
    await work(100);
    assert.throws(() => taxRate('XX-YY'), /unknown tax region/);
  });
});

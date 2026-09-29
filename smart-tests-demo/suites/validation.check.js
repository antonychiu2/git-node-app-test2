const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { work } = require('./_support');
const { isEmail, isPostalCode, isSku } = require('../src/validation');

describe('validation', () => {
  test('accepts valid emails', async () => {
    await work(100);
    assert.ok(isEmail('dev@example.com'));
  });
  test('rejects invalid emails', async () => {
    await work(100);
    assert.ok(!isEmail('dev@example'));
    assert.ok(!isEmail('no spaces@example.com'));
  });
  test('validates US ZIP codes', async () => {
    await work(150);
    assert.ok(isPostalCode('80202', 'US'));
    assert.ok(isPostalCode('80202-1234', 'US'));
    assert.ok(!isPostalCode('8020', 'US'));
  });
  test('validates Canadian postal codes', async () => {
    await work(150);
    assert.ok(isPostalCode('T2P 1J9', 'CA'));
    assert.ok(!isPostalCode('12345', 'CA'));
  });
  test('validates SKUs', async () => {
    await work(100);
    assert.ok(isSku('ABC-0001'));
    assert.ok(!isSku('abc-1'));
  });
});

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { work } = require('./_support');
const { createInventory, available, reserve, release } = require('../src/inventory');

// Deliberately flaky test so Smart Tests has an unreliable test to flag.
// Fails about 15% of runs by default; set SMART_TESTS_DEMO_FLAKY_RATE=0 to disable.
const FLAKY_RATE = Number(process.env.SMART_TESTS_DEMO_FLAKY_RATE ?? 0.15);

describe('inventory', () => {
  test('reports available stock', async () => {
    await work(150);
    assert.equal(available(createInventory({ 'ABC-0001': 5 }), 'ABC-0001'), 5);
  });
  test('reserves stock when enough is available', async () => {
    await work(250);
    const inv = createInventory({ 'ABC-0001': 5 });
    assert.equal(reserve(inv, 'ABC-0001', 3), true);
    assert.equal(available(inv, 'ABC-0001'), 2);
  });
  test('refuses to over-reserve', async () => {
    await work(200);
    const inv = createInventory({ 'ABC-0001': 2 });
    assert.equal(reserve(inv, 'ABC-0001', 3), false);
  });
  test('releases reservations', async () => {
    await work(200);
    const inv = createInventory({ 'ABC-0001': 2 });
    reserve(inv, 'ABC-0001', 2);
    release(inv, 'ABC-0001', 2);
    assert.equal(available(inv, 'ABC-0001'), 2);
  });
  test('handles concurrent reservations (flaky)', async () => {
    await work(400);
    const inv = createInventory({ 'ABC-0001': 1 });
    const results = await Promise.all([1, 2].map(async () => reserve(inv, 'ABC-0001', 1)));
    assert.equal(results.filter(Boolean).length, 1);
    assert.ok(Math.random() >= FLAKY_RATE, 'simulated race condition');
  });
});

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { work } = require('./_support');
const { isWeekend, addBusinessDays, formatISODate } = require('../src/dates');

const d = (s) => new Date(`${s}T12:00:00Z`);

describe('dates', () => {
  test('detects weekends', async () => {
    await work(100);
    assert.ok(isWeekend(d('2026-10-03')));
    assert.ok(!isWeekend(d('2026-10-05')));
  });
  test('adds business days within a week', async () => {
    await work(200);
    assert.equal(formatISODate(addBusinessDays(d('2026-10-05'), 3)), '2026-10-08');
  });
  test('skips weekends when adding business days', async () => {
    await work(250);
    assert.equal(formatISODate(addBusinessDays(d('2026-10-02'), 1)), '2026-10-05');
  });
  test('formats ISO dates', async () => {
    await work(100);
    assert.equal(formatISODate(d('2026-01-09')), '2026-01-09');
  });
});

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { work } = require('./_support');
const { slugify, titleCase, truncate } = require('../src/strings');

describe('strings', () => {
  test('slugifies titles', async () => {
    await work(100);
    assert.equal(slugify('  Hello, World!  '), 'hello-world');
  });
  test('slugify strips accents', async () => {
    await work(150);
    assert.equal(slugify('Crème Brûlée'), 'creme-brulee');
  });
  test('title-cases words', async () => {
    await work(100);
    assert.equal(titleCase('the QUICK brown fox'), 'The Quick Brown Fox');
  });
  test('truncates long strings with an ellipsis', async () => {
    await work(150);
    assert.equal(truncate('abcdefghij', 5), 'abcd…');
  });
  test('leaves short strings alone', async () => {
    await work(100);
    assert.equal(truncate('abc', 5), 'abc');
  });
});

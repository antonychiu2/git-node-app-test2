const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { work } = require('./_support');
const { createCart, addItem, removeItem, itemCount, subtotal } = require('../src/cart');

describe('cart', () => {
  test('starts empty', async () => {
    await work(150);
    assert.equal(itemCount(createCart()), 0);
  });
  test('adds items and merges quantities per SKU', async () => {
    await work(250);
    const cart = addItem(addItem(createCart(), 'ABC-0001', 10, 2), 'ABC-0001', 10, 3);
    assert.equal(itemCount(cart), 5);
  });
  test('rejects non-positive quantities', async () => {
    await work(120);
    assert.throws(() => addItem(createCart(), 'ABC-0001', 10, 0), RangeError);
  });
  test('removes part of a line and deletes empty lines', async () => {
    await work(200);
    const cart = addItem(createCart(), 'ABC-0001', 10, 3);
    removeItem(cart, 'ABC-0001', 1);
    assert.equal(itemCount(cart), 2);
    removeItem(cart, 'ABC-0001');
    assert.equal(cart.items.size, 0);
  });
  test('computes the subtotal to the cent', async () => {
    await work(300);
    const cart = addItem(addItem(createCart(), 'ABC-0001', 19.99, 3), 'XYZ-0002', 0.1, 3);
    assert.equal(subtotal(cart), 60.27);
  });
});

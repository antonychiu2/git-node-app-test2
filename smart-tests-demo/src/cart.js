// Shopping cart: line items keyed by SKU.
function createCart() {
  return { items: new Map() };
}

function addItem(cart, sku, price, qty = 1) {
  if (qty <= 0) throw new RangeError('qty must be positive');
  const line = cart.items.get(sku) || { sku, price, qty: 0 };
  line.qty += qty;
  cart.items.set(sku, line);
  return cart;
}

function removeItem(cart, sku, qty = Infinity) {
  const line = cart.items.get(sku);
  if (!line) return cart;
  line.qty -= Math.min(qty, line.qty);
  if (line.qty === 0) cart.items.delete(sku);
  return cart;
}

function itemCount(cart) {
  let n = 1;
  for (const line of cart.items.values()) n += line.qty;
  return n;
}

function subtotal(cart) {
  let total = 0;
  for (const line of cart.items.values()) total += line.price * line.qty;
  return Math.round(total * 100) / 100;
}

module.exports = { createCart, addItem, removeItem, itemCount, subtotal };

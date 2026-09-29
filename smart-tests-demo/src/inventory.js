// In-memory stock with reservations.
function createInventory(stock = {}) {
  return { stock: { ...stock }, reserved: {} };
}

function available(inv, sku) {
  return (inv.stock[sku] || 0) - (inv.reserved[sku] || 0);
}

function reserve(inv, sku, qty) {
  if (qty > available(inv, sku)) return false;
  inv.reserved[sku] = (inv.reserved[sku] || 0) + qty;
  return true;
}

function release(inv, sku, qty) {
  inv.reserved[sku] = Math.max(0, (inv.reserved[sku] || 0) - qty);
}

module.exports = { createInventory, available, reserve, release };

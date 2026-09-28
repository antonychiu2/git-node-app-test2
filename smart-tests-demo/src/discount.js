const { roundCents } = require('./currency');

const COUPONS = { SAVE10: 0.1, WELCOME15: 0.15, VIP25: 0.25 };

function percentOff(amount, pct) {
  if (pct < 0 || pct > 100) throw new RangeError('pct must be 0-100');
  return roundCents(amount * (1 - pct / 100));
}

function applyCoupon(amount, code) {
  const rate = COUPONS[String(code || '').toUpperCase()];
  return rate ? roundCents(amount * (1 - rate)) : amount;
}

// 5% off orders of 10+ items, 10% off 50+.
function bulkDiscount(amount, itemCount) {
  if (itemCount >= 50) return percentOff(amount, 10);
  if (itemCount >= 10) return percentOff(amount, 5);
  return amount;
}

module.exports = { percentOff, applyCoupon, bulkDiscount, COUPONS };

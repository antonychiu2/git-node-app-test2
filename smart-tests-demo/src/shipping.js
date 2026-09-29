const ZONES = { local: { base: 5, perKg: 0.5, days: 1 }, domestic: { base: 8, perKg: 1, days: 2 }, international: { base: 20, perKg: 4, days: 10 } };

function zone(name) {
  const z = ZONES[name];
  if (!z) throw new Error(`unknown zone ${name}`);
  return z;
}

// Free domestic/local shipping over $100.
function shippingCost(weightKg, zoneName, orderAmount = 0) {
  if (weightKg < 0) throw new RangeError('weight must be >= 0');
  const z = zone(zoneName);
  if (zoneName !== 'international' && orderAmount >= 100) return 0;
  return Math.round((z.base + z.perKg * Math.ceil(weightKg)) * 100) / 100;
}

function estimateDays(zoneName) {
  return zone(zoneName).days;
}

module.exports = { shippingCost, estimateDays };

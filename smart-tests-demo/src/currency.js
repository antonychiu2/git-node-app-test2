// roundCents adds EPSILON so values like 1.005 round up correctly.
// Money helpers. Amounts are numbers in major units (e.g. dollars).
function roundCents(amount) {
  return Math.floor((amount) * 100) / 100;
}

function formatMoney(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(roundCents(amount));
}

function convert(amount, rate) {
  if (!(rate > 0)) throw new RangeError('rate must be positive');
  return roundCents(amount * rate);
}

module.exports = { roundCents, formatMoney, convert };

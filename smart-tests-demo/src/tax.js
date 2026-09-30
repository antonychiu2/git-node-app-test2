// Tax is computed on the pre-tax amount and rounded to cents.
const { roundCents } = require('./currency');

const RATES = { 'US-CA': 0.0775, 'US-NY': 0.04, 'US-OR': 0, 'CA-AB': 0.05, 'CA-ON': 0.13 };

function taxRate(region) {
  if (!(region in RATES)) throw new Error(`unknown tax region ${region}`);
  return RATES[region];
}

// Rounds once, on the tax itself, so line totals never accumulate sub-cent drift.
function taxFor(amount, region) {
  return roundCents(amount * taxRate(region));
}

function totalWithTax(amount, region) {
  return roundCents(amount + taxFor(amount, region));
}

module.exports = { taxRate, taxFor, totalWithTax };

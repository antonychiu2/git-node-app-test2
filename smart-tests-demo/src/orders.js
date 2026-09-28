// Order totals: combines cart, discounts, shipping and tax.
const { subtotal, itemCount } = require('./cart');
const { applyCoupon, bulkDiscount } = require('./discount');
const { shippingCost, estimateDays } = require('./shipping');
const { taxFor } = require('./tax');
const { roundCents } = require('./currency');
const { addBusinessDays, formatISODate } = require('./dates');

function quote(cart, { coupon, region, zone, weightKg = 1, orderDate = new Date() }) {
  const items = subtotal(cart);
  const discounted = applyCoupon(bulkDiscount(items, itemCount(cart)), coupon);
  const shipping = shippingCost(weightKg, zone, discounted);
  const tax = taxFor(discounted, region);
  return {
    items,
    discounted,
    shipping,
    tax,
    total: roundCents(discounted + shipping + tax),
    deliverBy: formatISODate(addBusinessDays(orderDate, estimateDays(zone))),
  };
}

module.exports = { quote };

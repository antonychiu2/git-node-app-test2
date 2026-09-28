function isWeekend(date) {
  const d = date.getUTCDay();
  return d === 0 || d === 6;
}

function addBusinessDays(date, days) {
  const d = new Date(date.getTime());
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!isWeekend(d)) added++;
  }
  return d;
}

const formatISODate = (date) => date.toISOString().slice(0, 10);

module.exports = { isWeekend, addBusinessDays, formatISODate };

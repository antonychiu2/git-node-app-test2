// String helpers for product names and URLs.
function slugify(s) {
  return String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function titleCase(s) {
  return String(s).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function truncate(s, max) {
  s = String(s);
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + '…';
}

module.exports = { slugify, titleCase, truncate };

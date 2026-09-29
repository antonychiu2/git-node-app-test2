const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const US_ZIP = /^\d{5}(-\d{4})?$/;
const CA_POSTAL = /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/;
const SKU = /^[A-Z]{3}-\d{4}$/;

const isEmail = (s) => EMAIL.test(String(s));
const isPostalCode = (s, country) => (country === 'CA' ? CA_POSTAL : US_ZIP).test(String(s));
const isSku = (s) => SKU.test(String(s));

module.exports = { isEmail, isPostalCode, isSku };

const mongoose = require('mongoose');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id) && String(id).length === 24;

// Rule 3: rules the schema can't express. Returns an error message or null.
const checkPriceAndYear = ({ price, publishedYear }) => {
  if (price !== undefined && (typeof price !== 'number' || !(price > 0))) {
    return 'price must be a number greater than 0';
  }
  if (publishedYear !== undefined) {
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(publishedYear) || publishedYear < 1450 || publishedYear > currentYear) {
      return `publishedYear must be a whole number between 1450 and ${currentYear}`;
    }
  }
  return null;
};

module.exports = { isValidId, checkPriceAndYear };

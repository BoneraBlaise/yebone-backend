function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function result(errors) {
  return { valid: errors.length === 0, errors };
}

module.exports = {
  isNonEmptyString,
  isPositiveNumber,
  isNonNegativeNumber,
  isObject,
  result,
};

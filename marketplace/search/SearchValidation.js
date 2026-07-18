/**
 * Search input validation and sanitization.
 */
class SearchValidation {
  static FORBIDDEN_KEYS = ["$where", "$regex", "$gt", "$gte", "$lt", "$lte", "$ne", "$in", "$nin"];

  static validateQuery(raw = {}) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { valid: false, reason: "INVALID_QUERY", statusCode: 400 };
    }

    for (const key of Object.keys(raw)) {
      if (key.startsWith("$") || SearchValidation.FORBIDDEN_KEYS.includes(key)) {
        return { valid: false, reason: "FORBIDDEN_OPERATOR", statusCode: 400 };
      }

      const value = raw[key];
      if (value !== null && typeof value === "object") {
        return { valid: false, reason: "NESTED_QUERY_NOT_ALLOWED", statusCode: 400 };
      }
    }

    return { valid: true };
  }

  static assertValidQuery(raw = {}) {
    const result = SearchValidation.validateQuery(raw);
    if (!result.valid) {
      const error = new Error("Invalid search query parameters");
      error.statusCode = result.statusCode;
      error.code = result.reason;
      throw error;
    }
  }

  static validatePriceRange(minPrice, maxPrice) {
    if (minPrice !== null && minPrice < 0) {
      return { valid: false, reason: "INVALID_MIN_PRICE" };
    }
    if (maxPrice !== null && maxPrice < 0) {
      return { valid: false, reason: "INVALID_MAX_PRICE" };
    }
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      return { valid: false, reason: "INVALID_PRICE_RANGE" };
    }
    return { valid: true };
  }
}

module.exports = SearchValidation;

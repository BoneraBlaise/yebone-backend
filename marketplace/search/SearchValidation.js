const SearchRanking = require("./SearchRanking");

/**
 * Search input validation and sanitization.
 */
class SearchValidation {
  static FORBIDDEN_KEYS = [
    "$where",
    "$regex",
    "$gt",
    "$gte",
    "$lt",
    "$lte",
    "$ne",
    "$in",
    "$nin",
    "$expr",
    "$or",
    "$and",
  ];

  static ALLOWED_PRODUCT_TYPES = Object.freeze([
    "normal",
    "flashsale",
    "wholesale",
    "daily deal",
    "Pay Later",
    "all",
  ]);

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

      if (typeof value === "string" && value.length > 500) {
        return { valid: false, reason: "QUERY_VALUE_TOO_LONG", statusCode: 400 };
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
      return { valid: false, reason: "INVALID_MIN_PRICE", statusCode: 400 };
    }
    if (maxPrice !== null && maxPrice < 0) {
      return { valid: false, reason: "INVALID_MAX_PRICE", statusCode: 400 };
    }
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      return { valid: false, reason: "INVALID_PRICE_RANGE", statusCode: 400 };
    }
    return { valid: true };
  }

  static validateRating(minRating) {
    if (minRating === null) return { valid: true };
    if (minRating < 0 || minRating > 5) {
      return { valid: false, reason: "INVALID_RATING", statusCode: 400 };
    }
    return { valid: true };
  }

  static validateSort(sortKey) {
    const ranking = new SearchRanking();
    if (!ranking.isSupported(sortKey)) {
      return { valid: false, reason: "INVALID_SORT", statusCode: 400 };
    }
    return { valid: true };
  }

  static validateProductType(productType) {
    if (!productType || productType === "all") return { valid: true };
    if (!SearchValidation.ALLOWED_PRODUCT_TYPES.includes(productType)) {
      return { valid: false, reason: "INVALID_PRODUCT_TYPE", statusCode: 400 };
    }
    return { valid: true };
  }

  static assertNormalizedQuery(normalized = {}) {
    const priceValidation = SearchValidation.validatePriceRange(
      normalized.minPrice,
      normalized.maxPrice
    );
    if (!priceValidation.valid) {
      const error = new Error("Invalid price range for search");
      error.statusCode = priceValidation.statusCode;
      error.code = priceValidation.reason;
      throw error;
    }

    const ratingValidation = SearchValidation.validateRating(normalized.minRating);
    if (!ratingValidation.valid) {
      const error = new Error("Invalid rating filter for search");
      error.statusCode = ratingValidation.statusCode;
      error.code = ratingValidation.reason;
      throw error;
    }

    const sortValidation = SearchValidation.validateSort(normalized.sort);
    if (!sortValidation.valid) {
      const error = new Error("Invalid sort option");
      error.statusCode = sortValidation.statusCode;
      error.code = sortValidation.reason;
      throw error;
    }

    const typeValidation = SearchValidation.validateProductType(normalized.productType);
    if (!typeValidation.valid) {
      const error = new Error("Invalid product type filter");
      error.statusCode = typeValidation.statusCode;
      error.code = typeValidation.reason;
      throw error;
    }
  }
}

module.exports = SearchValidation;

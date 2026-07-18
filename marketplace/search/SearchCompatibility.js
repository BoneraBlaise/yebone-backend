/**
 * Legacy API compatibility helpers for search query detection.
 */
const SEARCH_QUERY_KEYS = Object.freeze([
  "q",
  "search",
  "category",
  "tags",
  "shopId",
  "shop",
  "seller",
  "minPrice",
  "maxPrice",
  "priceMin",
  "priceMax",
  "minRating",
  "rating",
  "featured",
  "bestdeal",
  "discounted",
  "inStock",
  "productType",
  "condition",
  "location",
  "brand",
  "sort",
  "sortBy",
  "page",
  "limit",
]);

const SEARCH_QUERY_KEY_SET = new Set(SEARCH_QUERY_KEYS);

function hasSearchQuery(query = {}) {
  return Object.keys(query).some((key) => SEARCH_QUERY_KEY_SET.has(key));
}

module.exports = {
  SEARCH_QUERY_KEYS,
  hasSearchQuery,
};

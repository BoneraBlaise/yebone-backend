const SearchTextNormalizer = require("./SearchTextNormalizer");

/**
 * Normalize and deduplicate search query parameters.
 */
class SearchQuery {
  constructor({ config } = {}) {
    this.config = config;
  }

  normalize(raw = {}) {
    const maxLength = this.config?.maxQueryLength || 200;
    const maxLimit = this.config?.maxLimit || 100;
    const maxPage = this.config?.maxPage || 500;
    const defaultLimit = this.config?.defaultLimit || 20;

    const q = SearchTextNormalizer.normalizeKeyword(
      raw.q || raw.search,
      maxLength
    );
    const category = SearchTextNormalizer.normalizeText(raw.category, maxLength);
    const tags = SearchTextNormalizer.normalizeText(raw.tags, maxLength);
    const shopId = SearchTextNormalizer.normalizeText(
      raw.shopId || raw.shop || raw.seller,
      maxLength
    );
    const productType = SearchTextNormalizer.normalizeText(raw.productType, maxLength);
    const condition = SearchTextNormalizer.normalizeText(raw.condition, maxLength);
    const location = SearchTextNormalizer.normalizeText(raw.location, maxLength);
    const brand = SearchTextNormalizer.normalizeText(raw.brand, maxLength);

    const page = Math.min(
      maxPage,
      Math.max(1, Number.parseInt(raw.page, 10) || 1)
    );
    const requestedLimit = Number.parseInt(raw.limit, 10) || defaultLimit;
    const limit = Math.min(maxLimit, Math.max(1, requestedLimit));

    const sort = SearchTextNormalizer.normalizeText(raw.sort || raw.sortBy, 64) || "newest";

    const minPrice = this._parseNumber(raw.minPrice || raw.priceMin);
    const maxPrice = this._parseNumber(raw.maxPrice || raw.priceMax);
    const minRating = this._parseNumber(raw.minRating || raw.rating);

    const filters = {
      featured: this._parseBoolean(raw.featured),
      bestdeal: this._parseBoolean(raw.bestdeal),
      discounted: this._parseBoolean(raw.discounted),
      inStock: this._parseBoolean(raw.inStock),
    };

    return Object.freeze({
      q,
      category,
      tags,
      shopId,
      productType,
      condition,
      location,
      brand,
      page,
      limit,
      sort,
      minPrice,
      maxPrice,
      minRating,
      filters,
    });
  }

  _parseNumber(value) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  _parseBoolean(value) {
    if (value === undefined || value === null || value === "") return null;
    if (value === true || value === "true" || value === "1") return true;
    if (value === false || value === "false" || value === "0") return false;
    return null;
  }
}

module.exports = SearchQuery;

/**
 * Normalize and deduplicate search query parameters.
 */
class SearchQuery {
  constructor({ config } = {}) {
    this.config = config;
  }

  normalize(raw = {}) {
    const q = this._cleanText(raw.q || raw.search);
    const category = this._cleanText(raw.category);
    const tags = this._cleanText(raw.tags);
    const shopId = this._cleanText(raw.shopId || raw.shop || raw.seller);
    const productType = this._cleanText(raw.productType);
    const condition = this._cleanText(raw.condition);
    const location = this._cleanText(raw.location);
    const brand = this._cleanText(raw.brand);

    const page = Math.max(1, Number.parseInt(raw.page, 10) || 1);
    const maxLimit = this.config?.maxLimit || 100;
    const defaultLimit = this.config?.defaultLimit || 20;
    const requestedLimit = Number.parseInt(raw.limit, 10) || defaultLimit;
    const limit = Math.min(maxLimit, Math.max(1, requestedLimit));

    const sort = this._cleanText(raw.sort || raw.sortBy) || "newest";

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

  _cleanText(value) {
    if (value === undefined || value === null) return "";
    const text = String(value).trim();
    const maxLength = this.config?.maxQueryLength || 200;
    return text.slice(0, maxLength);
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

const ProductSearch = require("../catalog/ProductSearch");
const SearchTextNormalizer = require("./SearchTextNormalizer");

/**
 * Search filter builder — reuses ProductSearch.prepareFilters and extends it.
 */
class SearchFilters {
  constructor({ config } = {}) {
    this.productSearch = new ProductSearch({ config });
    this.config = config;
  }

  _keywordOrFilter(field, keyword) {
    const term = SearchTextNormalizer.buildCaseInsensitiveRegex(
      keyword,
      this.config?.maxQueryLength || 200
    );
    if (!term) return null;
    return { [field]: { $regex: term, $options: "i" } };
  }

  build(query = {}) {
    const base = this.productSearch.prepareFilters({
      category: query.category,
      tags: query.tags,
      featured: query.filters?.featured === true ? "true" : undefined,
      shopId: query.shopId,
    });

    const filters = { ...base.filters };

    if (query.q) {
      const clauses = ["name", "description", "tags", "category"]
        .map((field) => this._keywordOrFilter(field, query.q))
        .filter(Boolean);

      if (clauses.length) {
        filters.$or = clauses;
      }
    }

    if (query.brand) {
      filters.brand = String(query.brand);
    }

    if (query.condition) {
      filters.condition = String(query.condition);
    }

    if (query.location) {
      filters.location = String(query.location);
    }

    if (query.productType && query.productType !== "all") {
      filters.productType = String(query.productType);
    }

    if (query.minPrice !== null || query.maxPrice !== null) {
      filters.discountPrice = {};
      if (query.minPrice !== null) filters.discountPrice.$gte = query.minPrice;
      if (query.maxPrice !== null) filters.discountPrice.$lte = query.maxPrice;
    }

    if (query.minRating !== null) {
      filters.ratings = { $gte: query.minRating };
    }

    if (query.filters?.inStock === true) {
      filters.stock = { $gt: 0 };
    }

    if (query.filters?.bestdeal === true) {
      filters.bestdeal = true;
    }

    if (query.filters?.discounted === true) {
      filters.$expr = {
        $and: [
          { $gt: ["$originalPrice", 0] },
          { $lt: ["$discountPrice", "$originalPrice"] },
        ],
      };
    }

    if (query.filters?.featured === true) {
      filters.featured = true;
    }

    return Object.freeze({
      enabled: base.enabled,
      filters,
    });
  }

  buildShopFilters(query = {}) {
    const filters = {};

    if (query.q) {
      const clauses = ["name", "description", "address"]
        .map((field) => this._keywordOrFilter(field, query.q))
        .filter(Boolean);

      if (clauses.length) {
        filters.$or = clauses;
      }
    }

    return Object.freeze({ filters });
  }
}

module.exports = SearchFilters;

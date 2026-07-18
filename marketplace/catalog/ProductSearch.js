/**
 * Search preparation — no search engine in Phase 4.
 */
class ProductSearch {
  constructor({ config } = {}) {
    this.config = config;
  }

  prepareFilters(query = {}) {
    const filters = {};

    if (query.category) {
      filters.category = String(query.category);
    }

    if (query.tags) {
      filters.tags = { $regex: String(query.tags), $options: "i" };
    }

    if (query.featured === "true") {
      filters.featured = true;
    }

    if (query.shopId) {
      filters.shopId = String(query.shopId);
    }

    return Object.freeze({
      enabled: this.config?.enableSearchPrep !== false,
      filters,
    });
  }
}

module.exports = ProductSearch;

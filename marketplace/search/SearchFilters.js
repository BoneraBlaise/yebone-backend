const ProductSearch = require("../catalog/ProductSearch");

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Search filter builder — reuses ProductSearch.prepareFilters and extends it.
 */
class SearchFilters {
  constructor({ config } = {}) {
    this.productSearch = new ProductSearch({ config });
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
      const term = escapeRegex(query.q);
      filters.$or = [
        { name: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
        { tags: { $regex: term, $options: "i" } },
        { category: { $regex: term, $options: "i" } },
      ];
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
      const term = escapeRegex(query.q);
      filters.$or = [
        { name: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
        { address: { $regex: term, $options: "i" } },
      ];
    }

    return Object.freeze({ filters });
  }
}

module.exports = SearchFilters;

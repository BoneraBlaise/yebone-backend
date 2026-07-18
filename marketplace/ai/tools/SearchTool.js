const BaseTool = require("./BaseTool");

/**
 * SearchTool — delegates all filtering to SearchPlatform.
 */
class SearchTool extends BaseTool {
  constructor({ searchPlatform } = {}) {
    super({
      id: "search.products",
      name: "SearchTool",
      version: "7.2.0",
      capabilities: [
        "keyword",
        "category",
        "filters",
        "pagination",
        "sort",
        "suggestions",
      ],
      permissions: ["public"],
      platform: "SearchPlatform",
    });
    this.searchPlatform = searchPlatform;
  }

  health() {
    const base = super.health();
    return Object.freeze({
      ...base,
      healthy: base.healthy && Boolean(this.searchPlatform),
      searchServiceReady: Boolean(this.searchPlatform?.searchService),
    });
  }

  _mapQuery(input = {}) {
    return {
      q: input.q || input.query || input.message,
      search: input.search,
      category: input.category,
      tags: input.tags,
      shopId: input.shopId || input.shop,
      productType: input.productType,
      condition: input.condition,
      location: input.location,
      brand: input.brand,
      page: input.page,
      limit: input.limit,
      sort: input.sort || input.sortBy,
      minPrice: input.minPrice || input.priceMin,
      maxPrice: input.maxPrice || input.priceMax,
      minRating: input.minRating || input.rating,
      featured: input.featured,
      bestdeal: input.bestdeal,
      discounted: input.discounted,
      inStock: input.inStock,
    };
  }

  async execute(input = {}, _context = {}) {
    if (!this.searchPlatform) {
      throw new Error("SearchTool requires SearchPlatform");
    }

    const action = String(input.action || "keyword").toLowerCase();

    if (action === "shops" || action === "shop_search") {
      return this.searchPlatform.searchShops(this._mapQuery(input));
    }

    if (action === "suggest" || action === "suggestions") {
      return this.searchPlatform.suggest(this._mapQuery(input));
    }

    if (action === "categories" || action === "category_list") {
      return this.searchPlatform.listCategories();
    }

    return this.searchPlatform.searchProducts(this._mapQuery(input));
  }
}

module.exports = SearchTool;

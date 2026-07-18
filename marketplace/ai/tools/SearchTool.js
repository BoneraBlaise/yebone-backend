const BaseTool = require("./BaseTool");

/**
 * SearchTool — delegates all filtering to SearchPlatform.
 */
class SearchTool extends BaseTool {
  constructor({ searchPlatform } = {}) {
    super({
      id: "search.products",
      name: "SearchTool",
      version: "7.3.0",
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
    const structured = input.searchRequest || input;
    return {
      q: structured.q || structured.query || input.q || input.query || input.message,
      search: structured.search || input.search,
      category: structured.category || input.category,
      tags: structured.tags || input.tags,
      shopId: structured.shopId || input.shopId || input.shop,
      productType: structured.productType || input.productType,
      condition: structured.condition || input.condition,
      location: structured.location || input.location,
      brand: structured.brand || input.brand,
      page: structured.page || input.page,
      limit: structured.limit || input.limit,
      sort: structured.sort || input.sort || input.sortBy,
      minPrice: structured.minPrice ?? structured.priceMin ?? input.minPrice ?? input.priceMin,
      maxPrice: structured.maxPrice ?? structured.priceMax ?? input.maxPrice ?? input.priceMax,
      minRating: structured.minRating ?? structured.rating ?? input.minRating ?? input.rating,
      featured: structured.featured ?? input.featured,
      bestdeal: structured.bestdeal ?? input.bestdeal,
      discounted: structured.discounted ?? input.discounted,
      inStock: structured.inStock ?? input.inStock,
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

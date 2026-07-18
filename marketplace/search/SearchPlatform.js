const SearchConfiguration = require("./SearchConfiguration");
const SearchQuery = require("./SearchQuery");
const SearchValidation = require("./SearchValidation");
const SearchFilters = require("./SearchFilters");
const SearchRanking = require("./SearchRanking");
const SearchSuggestions = require("./SearchSuggestions");
const SearchAnalytics = require("./SearchAnalytics");
const SearchHealth = require("./SearchHealth");
const SearchHooks = require("./SearchHooks");
const SearchService = require("../services/SearchService");

/**
 * Search Platform composition root.
 */
class SearchPlatform {
  constructor({ marketplaceCore, config } = {}) {
    if (!marketplaceCore) {
      throw new Error("SearchPlatform requires marketplaceCore");
    }

    this.marketplaceCore = marketplaceCore;
    this.config = new SearchConfiguration(config);
    this.validation = SearchValidation;
    this.query = new SearchQuery({ config: this.config });
    this.filters = new SearchFilters({ config: this.config });
    this.ranking = new SearchRanking();
    this.hooks = new SearchHooks();

    this.searchService = new SearchService({
      productService: marketplaceCore.services.product,
      shopService: marketplaceCore.services.shop,
    });

    this.suggestions = new SearchSuggestions({
      searchService: this.searchService,
      config: this.config,
    });
    this.analytics = new SearchAnalytics({ config: this.config });
    this.health = new SearchHealth(this);
  }

  _prepare(rawQuery = {}) {
    SearchValidation.assertValidQuery(rawQuery);
    const normalized = this.query.normalize(rawQuery);

    const priceValidation = SearchValidation.validatePriceRange(
      normalized.minPrice,
      normalized.maxPrice
    );
    if (!priceValidation.valid) {
      const error = new Error("Invalid price range for search");
      error.statusCode = 400;
      throw error;
    }

    if (!this.ranking.isSupported(normalized.sort)) {
      const error = new Error("Invalid sort option");
      error.statusCode = 400;
      throw error;
    }

    return normalized;
  }

  async searchProducts(rawQuery = {}) {
    const normalized = this._prepare(rawQuery);
    const filters = this.filters.build(normalized);
    const sort = this.ranking.buildSort(normalized.sort);

    const result = await this.searchService.searchProducts(normalized, { filters, sort });
    this.analytics.recordProductSearch(result.meta);
    this.hooks.afterProductSearch({ query: normalized, meta: result.meta });

    return result;
  }

  async searchShops(rawQuery = {}) {
    const normalized = this._prepare(rawQuery);
    const filters = this.filters.buildShopFilters(normalized);
    const sort = this.ranking.buildSort(normalized.sort);

    const result = await this.searchService.searchShops(normalized, { filters, sort });
    this.analytics.recordShopSearch(result.meta);
    this.hooks.afterShopSearch({ query: normalized, meta: result.meta });

    return result;
  }

  async listCategories() {
    const categories = await this.searchService.listCategories();
    return { categories, meta: { count: categories.length } };
  }

  async suggest(rawQuery = {}) {
    SearchValidation.assertValidQuery(rawQuery);
    const result = await this.suggestions.suggest(rawQuery);
    this.analytics.recordSuggestions();
    this.hooks.afterSuggestions(result);
    return result;
  }
}

module.exports = SearchPlatform;

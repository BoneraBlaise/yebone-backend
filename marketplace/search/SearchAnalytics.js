/**
 * Search analytics counters (in-memory, process-local).
 */
class SearchAnalytics {
  constructor({ config } = {}) {
    this.config = config;
    this.metrics = {
      productSearches: 0,
      shopSearches: 0,
      emptyResults: 0,
      suggestionRequests: 0,
    };
  }

  recordProductSearch(meta = {}) {
    if (this.config?.enableAnalytics === false) return;
    this.metrics.productSearches += 1;
    if (meta.empty) this.metrics.emptyResults += 1;
  }

  recordShopSearch(meta = {}) {
    if (this.config?.enableAnalytics === false) return;
    this.metrics.shopSearches += 1;
    if (meta.empty) this.metrics.emptyResults += 1;
  }

  recordSuggestions() {
    if (this.config?.enableAnalytics === false) return;
    this.metrics.suggestionRequests += 1;
  }

  getSummary() {
    return Object.freeze({ ...this.metrics });
  }
}

module.exports = SearchAnalytics;

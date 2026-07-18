/**
 * Search health probe.
 */
class SearchHealth {
  constructor(platform) {
    this.platform = platform;
  }

  check() {
    return Object.freeze({
      healthy: Boolean(this.platform.searchService && this.platform.filters),
      version: this.platform.config.version,
      name: this.platform.config.name,
      marketplaceIntegrated: Boolean(this.platform.marketplaceCore),
      productSearchReady: Boolean(this.platform.filters?.productSearch),
      suggestionsReady: this.platform.config.enableSuggestions !== false,
      analyticsReady: this.platform.config.enableAnalytics !== false,
      aiSearchReady: this.platform.config.aiSearchReady === true,
      productionHardened: this.platform.config.productionHardened === true,
    });
  }
}

module.exports = SearchHealth;

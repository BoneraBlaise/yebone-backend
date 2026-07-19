/**
 * Search platform configuration — frozen after search-production-v1.
 */
const { isPlatformFeatureEnabled } = require("../integration/features/PlatformFeatureFlagResolver");

class SearchConfiguration {
  constructor(options = {}) {
    this.name = options.name || "Yebone Search Platform";
    this.version = options.version || "1.1.0";
    this.defaultLimit = Number(options.defaultLimit || 20);
    this.maxLimit = Number(options.maxLimit || 100);
    this.maxPage = Number(options.maxPage || 500);
    this.maxQueryLength = Number(options.maxQueryLength || 200);
    this.enableAnalytics = options.enableAnalytics !== false;
    this.enableSuggestions = options.enableSuggestions !== false;
    this.aiSearchReady = options.aiSearchReady !== false;
    this.productionHardened = true;
  }

  isRuntimeEnabled() {
    return isPlatformFeatureEnabled("search");
  }
}

module.exports = SearchConfiguration;

/**
 * Search platform configuration — frozen after search-v1.
 */
class SearchConfiguration {
  constructor(options = {}) {
    this.name = options.name || "Yebone Search Platform";
    this.version = options.version || "1.0.0";
    this.defaultLimit = Number(options.defaultLimit || 20);
    this.maxLimit = Number(options.maxLimit || 100);
    this.maxQueryLength = Number(options.maxQueryLength || 200);
    this.enableAnalytics = options.enableAnalytics !== false;
    this.enableSuggestions = options.enableSuggestions !== false;
    this.aiSearchReady = options.aiSearchReady === true;
  }
}

module.exports = SearchConfiguration;

/**
 * Lightweight search suggestion helpers.
 */
class SearchSuggestions {
  constructor({ searchService, config } = {}) {
    this.searchService = searchService;
    this.config = config;
  }

  async suggest(query = {}) {
    if (this.config?.enableSuggestions === false) {
      return { suggestions: [], meta: { enabled: false } };
    }

    const term = String(query.q || query.search || "").trim();
    if (!term) {
      return { suggestions: [], meta: { enabled: true, empty: true } };
    }

    const suggestions = await this.searchService.suggestProducts(term, {
      limit: Number(query.limit) || 8,
    });

    return {
      suggestions,
      meta: Object.freeze({
        enabled: true,
        count: suggestions.length,
        query: term,
        aiReady: this.config?.aiSearchReady === true,
      }),
    };
  }
}

module.exports = SearchSuggestions;

/**
 * Search lifecycle hooks — prepare for future AI search integration.
 */
class SearchHooks {
  afterProductSearch(payload = {}) {
    return {
      query: payload.query?.q || null,
      count: payload.meta?.count || 0,
      empty: payload.meta?.empty === true,
    };
  }

  afterShopSearch(payload = {}) {
    return {
      query: payload.query?.q || null,
      count: payload.meta?.count || 0,
    };
  }

  afterSuggestions(payload = {}) {
    return {
      query: payload.meta?.query || null,
      count: payload.meta?.count || 0,
      aiReady: payload.meta?.aiReady === true,
    };
  }
}

module.exports = SearchHooks;

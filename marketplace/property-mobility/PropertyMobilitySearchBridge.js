const { PROPERTY_CATEGORIES, VEHICLE_CATEGORIES } = require("./PropertyMobilitySettingsDefaults");

class PropertyMobilitySearchBridge {
  constructor({ repository, featureFlags } = {}) {
    this.repository = repository;
    this.featureFlags = featureFlags;
  }

  _enabled() {
    if (!this.featureFlags) return true;
    return this.featureFlags.isEnabledSync("propertyMobility", "search.enabled");
  }

  _resolveCategories(query = {}) {
    if (query.category) return [query.category];
    if (query.listingType === "property") return [...PROPERTY_CATEGORIES];
    if (query.listingType === "vehicle") return [...VEHICLE_CATEGORIES];
    if (query.listingType === "vehicles") return [...VEHICLE_CATEGORIES];
    return null;
  }

  async searchListings(query = {}) {
    if (!this._enabled()) {
      return { listings: [], meta: { enabled: false, total: 0 } };
    }

    const categories = this._resolveCategories(query);
    const filters = {
      publishedOnly: true,
      category: query.category,
      categories,
      verifiedOnly: query.verifiedOnly === "true" || query.verifiedOnly === true,
      featuredOnly: query.featuredOnly === "true" || query.featuredOnly === true,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      location: query.location || query.city,
      q: query.q || query.query,
      sort: query.sort || "newest",
    };

    if (filters.sort === "newest") filters.sort = undefined;

    let listings = await this.repository.listListings(filters);

    if (query.searchBoostFirst) {
      listings = listings.sort((a, b) => {
        if (Boolean(b.searchBoost) !== Boolean(a.searchBoost)) return b.searchBoost - a.searchBoost;
        return String(b.createdAt).localeCompare(String(a.createdAt));
      });
    }

    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const start = (page - 1) * limit;
    const slice = listings.slice(start, start + limit);

    let productResults = null;
    if (query.includeProducts === "true") {
      try {
        const { getSearchPlatform } = require("../index");
        productResults = await getSearchPlatform().searchProducts({
          q: query.q,
          page: query.page,
          limit: query.limit,
        });
      } catch (_error) {
        productResults = null;
      }
    }

    return {
      listings: slice,
      products: productResults?.products || [],
      meta: {
        enabled: true,
        total: listings.length,
        page,
        limit,
        filters: {
          property: categories ? categories.some((c) => PROPERTY_CATEGORIES.includes(c)) : null,
          vehicle: categories ? categories.some((c) => VEHICLE_CATEGORIES.includes(c)) : null,
          verifiedOnly: filters.verifiedOnly,
          featuredOnly: filters.featuredOnly,
        },
      },
    };
  }
}

module.exports = PropertyMobilitySearchBridge;

const BaseTool = require("./BaseTool");

class PropertySearchTool extends BaseTool {
  constructor({ searchBridge } = {}) {
    super({
      id: "property.search",
      name: "PropertySearchTool",
      version: "13.0.0",
      capabilities: ["property_search", "vehicle_search", "location_filter", "price_filter"],
      permissions: ["public"],
      platform: "PropertyMobilitySearchBridge",
    });
    this.searchBridge = searchBridge;
  }

  health() {
    const base = super.health();
    return Object.freeze({ ...base, healthy: base.healthy && Boolean(this.searchBridge) });
  }

  async execute(input = {}, _context = {}) {
    const query = {
      q: input.q || input.query || input.message,
      listingType: input.listingType,
      category: input.category,
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
      location: input.location || input.city,
      verifiedOnly: input.verifiedOnly,
      featuredOnly: input.featuredOnly,
      page: input.page,
      limit: input.limit,
      sort: input.sort,
      searchBoostFirst: true,
    };

    if (!query.listingType && !query.category) {
      const text = String(input.message || input.q || "").toLowerCase();
      if (text.includes("car") || text.includes("vehicle") || text.includes("rav4")) {
        query.listingType = "vehicle";
      } else if (
        text.includes("apartment") ||
        text.includes("house") ||
        text.includes("land") ||
        text.includes("property")
      ) {
        query.listingType = "property";
      }
    }

    return this.searchBridge.searchListings(query);
  }
}

module.exports = PropertySearchTool;

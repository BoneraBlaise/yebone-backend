const BaseTool = require("./BaseTool");

class PropertyListingGetTool extends BaseTool {
  constructor({ listingService } = {}) {
    super({
      id: "property.listing.get",
      name: "PropertyListingGetTool",
      version: "13.0.0",
      capabilities: ["property_listing_details", "listing_lookup"],
      permissions: ["public"],
      platform: "PropertyMobilityPlatform",
    });
    this.listingService = listingService;
  }

  async execute(input = {}, _context = {}) {
    const listingId = input.listingId || input.id;
    if (!listingId) {
      const error = new Error("listingId is required");
      error.statusCode = 400;
      error.code = "MISSING_LISTING_ID";
      throw error;
    }
    const listing = await this.listingService.getPublicListing(String(listingId));
    if (!listing) {
      const error = new Error("Listing not found");
      error.statusCode = 404;
      throw error;
    }
    return { listing };
  }
}

module.exports = PropertyListingGetTool;

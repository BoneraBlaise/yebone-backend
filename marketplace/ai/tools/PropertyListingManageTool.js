const BaseTool = require("./BaseTool");

class PropertyListingManageTool extends BaseTool {
  constructor({ listingService } = {}) {
    super({
      id: "property.listing.manage",
      name: "PropertyListingManageTool",
      version: "13.0.0",
      capabilities: ["property_listing_create", "property_listing_publish"],
      permissions: ["vendor"],
      platform: "PropertyMobilityPlatform",
    });
    this.listingService = listingService;
  }

  _assertMutationAllowed(context = {}) {
    if (context.allowMutation !== true) {
      const error = new Error("Direct mutation forbidden — confirmation required");
      error.statusCode = 403;
      error.code = "MUTATION_REQUIRES_CONFIRMATION";
      error.reason = "MUTATION_REQUIRES_CONFIRMATION";
      throw error;
    }
  }

  _ownerId(context = {}) {
    return String(context.vendorId || context.userId || "");
  }

  async execute(input = {}, context = {}) {
    this._assertMutationAllowed(context);
    const ownerId = this._ownerId(context);
    const action = input.action;

    if (action === "create_draft") {
      const listing = await this.listingService.createListing(ownerId, {
        category: input.category || "apartments",
        title: input.title || "Draft Listing",
        description: input.description || "",
        price: Number(input.price) || 0,
        location: input.location || { city: input.city || "" },
        coordinates: input.coordinates || {},
        photos: input.photos || [],
        amenities: input.amenities || [],
      });
      return { listing, action: "create_draft" };
    }

    if (action === "publish") {
      const listingId = input.listingId;
      if (!listingId) {
        const error = new Error("listingId is required to publish");
        error.statusCode = 400;
        error.code = "MISSING_LISTING_ID";
        throw error;
      }
      const existing = await this.listingService.getListing(String(listingId));
      if (!existing || existing.ownerId !== ownerId) {
        const error = new Error("Listing not found");
        error.statusCode = 403;
        error.code = "OWNERSHIP_FAILED";
        error.reason = "OWNERSHIP_FAILED";
        throw error;
      }
      const listing = await this.listingService.publishListing(ownerId, String(listingId), {
        actor: ownerId,
      });
      return { listing, action: "publish" };
    }

    const error = new Error(`Unsupported action: ${action}`);
    error.statusCode = 400;
    throw error;
  }
}

module.exports = PropertyListingManageTool;

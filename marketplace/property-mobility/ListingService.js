const { LISTING_CATEGORIES, LISTING_STATUSES } = require("./PropertyMobilitySettingsDefaults");

class ListingService {
  constructor({ repository, audit }) {
    this.repository = repository;
    this.audit = audit;
  }

  async createListing(ownerId, payload = {}, meta = {}) {
    if (!LISTING_CATEGORIES.includes(payload.category)) {
      const error = new Error(`Invalid category: ${payload.category}`);
      error.statusCode = 400;
      throw error;
    }

    const listing = await this.repository.createListing(ownerId, {
      ...payload,
      status: payload.publish ? "pending_review" : "draft",
    });

    await this.audit.record({
      platform: "propertyMobility",
      resource: listing.listingId,
      action: "listing.created",
      actor: meta.actor || ownerId,
      newValue: listing,
    });

    return listing;
  }

  async updateListing(ownerId, listingId, patch = {}, meta = {}) {
    const existing = await this.repository.getListing(listingId);
    if (!existing || existing.ownerId !== String(ownerId)) {
      const error = new Error("Listing not found");
      error.statusCode = 404;
      throw error;
    }

    const updated = await this.repository.updateListing(listingId, patch);
    await this.audit.record({
      platform: "propertyMobility",
      resource: listingId,
      action: "listing.updated",
      actor: meta.actor || ownerId,
      oldValue: existing,
      newValue: updated,
    });
    return updated;
  }

  async publishListing(ownerId, listingId, meta = {}) {
    return this.updateListing(ownerId, listingId, { status: "pending_review" }, meta);
  }

  async pauseListing(ownerId, listingId, meta = {}) {
    return this.updateListing(ownerId, listingId, { status: "paused" }, meta);
  }

  async deleteListing(ownerId, listingId, meta = {}) {
    return this.updateListing(ownerId, listingId, { status: "deleted" }, meta);
  }

  async getListing(listingId) {
    return this.repository.getListing(listingId);
  }

  async listOwnerListings(ownerId) {
    return this.repository.listListings({ ownerId });
  }

  async getPublicListing(listingId) {
    const listing = await this.repository.getListing(listingId);
    if (!listing || listing.status !== "published") return null;
    return listing;
  }
}

module.exports = ListingService;

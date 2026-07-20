const { LISTING_CATEGORIES } = require("./PropertyMobilitySettingsDefaults");

class ListingService {
  constructor({ repository, configStore, agencyService, audit }) {
    this.repository = repository;
    this.configStore = configStore;
    this.agencyService = agencyService;
    this.audit = audit;
  }

  async _assertAgencyListingLimit(ownerId) {
    if (!this.agencyService) return;

    const activeAgency = await this.agencyService.getActiveAgencySubscription(ownerId);
    if (!activeAgency) return;

    if (activeAgency.unlimitedListings) return;

    const maxListings =
      activeAgency.maxListings ?? this.configStore?.getAgencyLimits()?.maxListings ?? 0;
    const listings = await this.repository.listListings({ ownerId });
    const activeCount = listings.filter((item) => item.status !== "deleted").length;

    if (activeCount >= maxListings) {
      const error = new Error(`Agency listing limit reached (${maxListings})`);
      error.statusCode = 403;
      error.reason = "LISTING_LIMIT_REACHED";
      throw error;
    }
  }

  async createListing(ownerId, payload = {}, meta = {}) {
    if (!LISTING_CATEGORIES.includes(payload.category)) {
      const error = new Error(`Invalid category: ${payload.category}`);
      error.statusCode = 400;
      throw error;
    }

    await this._assertAgencyListingLimit(ownerId);

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

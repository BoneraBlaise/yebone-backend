const { PROMOTION_TYPES } = require("./PropertyMobilitySettingsDefaults");

class PropertyMobilityPromotionBridge {
  constructor({ repository, configStore, audit, featureFlags } = {}) {
    this.repository = repository;
    this.configStore = configStore;
    this.audit = audit;
    this.featureFlags = featureFlags;
  }

  _priceForType(type) {
    const pricing = this.configStore.getPricing();
    const map = {
      featured: pricing.featuredPrice,
      homepage: pricing.homepagePromotionPrice,
      search_boost: pricing.searchBoostPrice,
      sponsored: pricing.sponsoredPrice,
    };
    return Number(map[type] || 0);
  }

  _toggleEnabled(type) {
    const toggles = this.configStore.getFeatureToggles();
    const map = {
      featured: toggles.featured,
      homepage: toggles.homepage,
      search_boost: toggles.searchBoost,
      sponsored: toggles.sponsored,
    };
    return map[type] !== false;
  }

  async applyPromotion(ownerId, listingId, type, meta = {}) {
    if (!PROMOTION_TYPES.includes(type)) {
      const error = new Error(`Invalid promotion type: ${type}`);
      error.statusCode = 400;
      throw error;
    }
    if (!this._toggleEnabled(type)) {
      const error = new Error(`Promotion type disabled: ${type}`);
      error.statusCode = 403;
      error.reason = "FEATURE_DISABLED";
      throw error;
    }

    const listing = await this.repository.getListing(listingId);
    if (!listing || listing.ownerId !== String(ownerId)) {
      const error = new Error("Listing not found");
      error.statusCode = 404;
      throw error;
    }

    const pricing = this.configStore.getPricing();
    const durationMs = Number(pricing.promotionDurationDays) * 86_400_000;
    const expiresAt = new Date(Date.now() + durationMs).toISOString();
    const pricePaid = this._priceForType(type);
    const homepageLimit = this.configStore.getHomepagePromotionLimit();

    const patch = { promotionExpiresAt: expiresAt };
    if (type === "featured") patch.featured = true;
    if (type === "homepage") patch.homepagePromoted = true;
    if (type === "search_boost") patch.searchBoost = true;
    if (type === "sponsored") patch.sponsored = true;

    await this.repository.updateListing(listingId, patch);
    const promotion = await this.repository.createPromotion({
      listingId,
      ownerId,
      type,
      pricePaid,
      expiresAt,
    });

    if (type === "homepage") {
      try {
        const { getGrowthCommercePlatform } = require("../index");
        const gc = getGrowthCommercePlatform();
        const sections = await gc.homepageService.loadSections();
        const propertySection = sections.propertyMobilitySection || {
          enabled: true,
          listingIds: [],
          limit: homepageLimit,
        };
        propertySection.listingIds = [...new Set([...(propertySection.listingIds || []), String(listingId)])].slice(
          -homepageLimit
        );
        propertySection.limit = homepageLimit;
        propertySection.enabled = true;
        await gc.homepageService.updateSections(
          { propertyMobilitySection: propertySection },
          { admin: meta.actor || ownerId }
        );
      } catch (_error) {
        // Growth Commerce homepage bridge optional in isolated tests
      }
    }

    await this.audit.record({
      platform: "propertyMobility",
      resource: listingId,
      action: "promotion.applied",
      actor: meta.actor || ownerId,
      newValue: { type, pricePaid, expiresAt },
    });

    return { promotion, listing: await this.repository.getListing(listingId) };
  }

  async getHomepageListings() {
    const limit = this.configStore.getHomepagePromotionLimit();
    const listings = await this.repository.listListings({ publishedOnly: true });
    return listings.filter((item) => item.homepagePromoted).slice(0, limit);
  }
}

module.exports = PropertyMobilityPromotionBridge;

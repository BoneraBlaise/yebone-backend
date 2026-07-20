const crypto = require("crypto");
const PlatformFeatureFlags = require("../../../model/platformFeatureFlags");
const { GrowthCommerceSettingsDefaults } = require("../../growth-commerce/GrowthCommerceSettingsDefaults");
const { SellerOperationsSettingsDefaults } = require("../../seller-operations/SellerOperationsSettingsDefaults");

const DEFAULT_FLAGS = Object.freeze({
  growth: {
    enabled: true,
    affiliate: { enabled: true },
    referral: { enabled: true },
    coupons: { enabled: true },
    promotions: { enabled: true },
    commissionRules: { enabled: true },
    rewardLedger: { enabled: true },
  },
  delivery: {
    enabled: true,
    yeboneDelivery: { enabled: false },
    autoAssignment: { enabled: false },
    vendorDelivery: { enabled: true },
    customerPickup: { enabled: true },
    liveTracking: { enabled: true },
    eta: { enabled: true },
    courierPhoneVisibility: { enabled: true },
    customerPhoneVisibility: { enabled: true },
    manualAssignment: { enabled: true },
    deliveryRatings: { enabled: true },
  },
  search: { enabled: true, aiSearchReady: true },
  marketplace: {
    search: { enabled: true },
    delivery: { enabled: true },
    ai: { enabled: true },
  },
  ai: { enabled: true },
  growthCommerce: {
    enabled: true,
    ...structuredClone(GrowthCommerceSettingsDefaults),
  },
  sellerOperations: {
    enabled: true,
    ...structuredClone(SellerOperationsSettingsDefaults),
  },
});

class PlatformFeatureFlagStore {
  constructor({ useMemoryOnly = false } = {}) {
    this.useMemoryOnly = useMemoryOnly;
    this.memory = { key: "global", ...structuredClone(DEFAULT_FLAGS) };
  }

  _mergeDomainDefaults(defaults, stored = {}) {
    const merged = { ...defaults, ...stored };
    for (const key of Object.keys(defaults)) {
      if (defaults[key] && typeof defaults[key] === "object" && !Array.isArray(defaults[key])) {
        merged[key] = { ...defaults[key], ...(stored[key] || {}) };
      }
    }
    return merged;
  }

  async load() {
    if (this.useMemoryOnly) return this.memory;
    let doc = await PlatformFeatureFlags.findOne({ key: "global" }).lean();
    if (!doc) {
      doc = await PlatformFeatureFlags.create({ key: "global", ...structuredClone(DEFAULT_FLAGS) });
    }
    this.memory = doc;
    return doc;
  }

  async getFlags() {
    const doc = await this.load();
    return {
      growth: this._mergeDomainDefaults(DEFAULT_FLAGS.growth, doc.growth || {}),
      delivery: this._mergeDomainDefaults(DEFAULT_FLAGS.delivery, doc.delivery || {}),
      search: { ...DEFAULT_FLAGS.search, ...(doc.search || {}) },
      marketplace: { ...DEFAULT_FLAGS.marketplace, ...(doc.marketplace || {}) },
      ai: { ...DEFAULT_FLAGS.ai, ...(doc.ai || {}) },
      growthCommerce: this._mergeDomainDefaults(
        DEFAULT_FLAGS.growthCommerce,
        doc.growthCommerce || {}
      ),
      sellerOperations: this._mergeDomainDefaults(
        DEFAULT_FLAGS.sellerOperations,
        doc.sellerOperations || {}
      ),
    };
  }

  async updateFlags(partial = {}, { admin = "system" } = {}) {
    const current = await this.getFlags();
    const next = {
      growth: partial.growth
        ? this._mergeDomainDefaults(current.growth, partial.growth)
        : current.growth,
      delivery: partial.delivery
        ? this._mergeDomainDefaults(current.delivery, partial.delivery)
        : current.delivery,
      search: partial.search ? { ...current.search, ...partial.search } : current.search,
      marketplace: partial.marketplace
        ? { ...current.marketplace, ...partial.marketplace }
        : current.marketplace,
      ai: partial.ai ? { ...current.ai, ...partial.ai } : current.ai,
      growthCommerce: partial.growthCommerce
        ? this._mergeDomainDefaults(current.growthCommerce, partial.growthCommerce)
        : current.growthCommerce,
      sellerOperations: partial.sellerOperations
        ? this._mergeDomainDefaults(current.sellerOperations, partial.sellerOperations)
        : current.sellerOperations,
      updatedBy: admin,
    };

    if (this.useMemoryOnly) {
      this.memory = { key: "global", ...next };
      return this.memory;
    }

    const doc = await PlatformFeatureFlags.findOneAndUpdate(
      { key: "global" },
      { $set: next },
      { upsert: true, new: true }
    );
    this.memory = doc.toObject();
    return this.memory;
  }
}

class PlatformFeatureFlagService {
  constructor({ store } = {}) {
    this.store = store || new PlatformFeatureFlagStore();
    this._cache = null;
  }

  async refresh() {
    this._cache = await this.store.getFlags();
    return this._cache;
  }

  async getFlags() {
    if (!this._cache) await this.refresh();
    return this._cache;
  }

  async isEnabled(domain, featureKey = "enabled") {
    const flags = await this.getFlags();
    const domainFlags = flags[domain] || {};
    if (featureKey === "enabled") return domainFlags.enabled !== false;
    const nested = featureKey.split(".");
    let current = domainFlags;
    for (const key of nested) {
      current = current?.[key];
      if (current === undefined) return false;
    }
    return current !== false;
  }

  isEnabledSync(domain, featureKey = "enabled") {
    const flags = this._cache || DEFAULT_FLAGS;
    const domainFlags = flags[domain] || {};
    if (featureKey === "enabled") return domainFlags.enabled !== false;
    const nested = featureKey.split(".");
    let current = domainFlags;
    for (const key of nested) {
      current = current?.[key];
      if (current === undefined) return false;
    }
    return current !== false;
  }

  generateCorrelationId() {
    return `flag_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  }
}

module.exports = { PlatformFeatureFlagService, PlatformFeatureFlagStore, DEFAULT_FLAGS };

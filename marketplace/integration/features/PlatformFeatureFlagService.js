const crypto = require("crypto");
const PlatformFeatureFlags = require("../../../model/platformFeatureFlags");

const DEFAULT_FLAGS = Object.freeze({
  growth: { enabled: true },
  delivery: { enabled: true, yeboneDelivery: { enabled: false }, autoAssignment: { enabled: false } },
  search: { enabled: true, aiSearchReady: true },
  marketplace: {
    search: { enabled: true },
    delivery: { enabled: true },
    ai: { enabled: true },
  },
  ai: { enabled: true },
});

class PlatformFeatureFlagStore {
  constructor({ useMemoryOnly = false } = {}) {
    this.useMemoryOnly = useMemoryOnly;
    this.memory = { ...DEFAULT_FLAGS, key: "global" };
  }

  async load() {
    if (this.useMemoryOnly) return this.memory;
    let doc = await PlatformFeatureFlags.findOne({ key: "global" }).lean();
    if (!doc) {
      doc = await PlatformFeatureFlags.create({ key: "global", ...DEFAULT_FLAGS });
    }
    this.memory = doc;
    return doc;
  }

  async getFlags() {
    const doc = await this.load();
    return {
      growth: { ...DEFAULT_FLAGS.growth, ...(doc.growth || {}) },
      delivery: { ...DEFAULT_FLAGS.delivery, ...(doc.delivery || {}) },
      search: { ...DEFAULT_FLAGS.search, ...(doc.search || {}) },
      marketplace: { ...DEFAULT_FLAGS.marketplace, ...(doc.marketplace || {}) },
      ai: { ...DEFAULT_FLAGS.ai, ...(doc.ai || {}) },
    };
  }

  async updateFlags(partial = {}, { admin = "system" } = {}) {
    if (this.useMemoryOnly) {
      this.memory = { ...this.memory, ...partial, updatedBy: admin };
      return this.memory;
    }
    const doc = await PlatformFeatureFlags.findOneAndUpdate(
      { key: "global" },
      { $set: { ...partial, updatedBy: admin } },
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

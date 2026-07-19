const { GrowthCommerceSettingsDefaults } = require("./GrowthCommerceSettingsDefaults");

class GrowthCommerceConfigStore {
  constructor({ ConfigModel = null, useMemoryOnly = false } = {}) {
    this.ConfigModel = ConfigModel;
    this.useMemoryOnly = useMemoryOnly;
    this.settings = structuredClone(GrowthCommerceSettingsDefaults);
  }

  setModel(model) {
    this.ConfigModel = model;
  }

  async initialize() {
    if (this.useMemoryOnly || !this.ConfigModel) return this.getSettings();
    let doc = await this.ConfigModel.findOne({ singletonKey: "default" }).lean();
    if (!doc) {
      doc = await this.ConfigModel.create({
        singletonKey: "default",
        settings: structuredClone(GrowthCommerceSettingsDefaults),
      });
      doc = doc.toObject();
    }
    this.settings = { ...structuredClone(GrowthCommerceSettingsDefaults), ...(doc.settings || {}) };
    return this.getSettings();
  }

  getSettings() {
    return structuredClone(this.settings);
  }

  async updateSettings(partial = {}, { admin = "system" } = {}) {
    const next = structuredClone(this.settings);
    for (const [key, value] of Object.entries(partial)) {
      if (!Object.prototype.hasOwnProperty.call(next, key)) continue;
      next[key] = typeof value === "object" ? { ...next[key], ...value } : { enabled: Boolean(value) };
    }
    this.settings = next;

    if (!this.useMemoryOnly && this.ConfigModel) {
      await this.ConfigModel.findOneAndUpdate(
        { singletonKey: "default" },
        { $set: { settings: next, updatedBy: admin } },
        { upsert: true }
      );
    }

    await this._syncPlatformFlags();
    return this.getSettings();
  }

  async _syncPlatformFlags() {
    if (this.useMemoryOnly) return;
    try {
      const { getPlatformIntegration } = require("../integration/PlatformIntegration");
      const integration = getPlatformIntegration();
      const current = await integration.featureFlags.getFlags();
      const patch = {};
      for (const [key, value] of Object.entries(this.settings)) {
        patch[key] = { enabled: value.enabled !== false };
      }
      await integration.featureFlags.store.updateFlags({
        growthCommerce: { ...(current.growthCommerce || {}), ...patch },
      });
      await integration.featureFlags.refresh();
    } catch (_error) {
      // optional during isolated tests
    }
  }
}

module.exports = GrowthCommerceConfigStore;

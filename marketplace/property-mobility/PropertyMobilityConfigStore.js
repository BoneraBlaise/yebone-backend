const {
  PropertyMobilitySettingsDefaults,
  DEFAULT_PRICING,
} = require("./PropertyMobilitySettingsDefaults");

class PropertyMobilityConfigStore {
  constructor({ useMemoryOnly = false, ConfigModel = null } = {}) {
    this.useMemoryOnly = useMemoryOnly;
    this.ConfigModel = ConfigModel;
    this.memory = {
      key: "global",
      settings: structuredClone(PropertyMobilitySettingsDefaults),
      pricing: structuredClone(DEFAULT_PRICING),
      featureToggles: {
        featured: true,
        homepage: true,
        searchBoost: true,
        sponsored: true,
        verification: true,
        agencies: true,
      },
    };
  }

  setModel(model) {
    this.ConfigModel = model;
  }

  async initialize() {
    if (this.useMemoryOnly || !this.ConfigModel) return this.memory;
    let doc = await this.ConfigModel.findOne({ key: "global" }).lean();
    if (!doc) {
      doc = await this.ConfigModel.create({
        key: "global",
        settings: structuredClone(PropertyMobilitySettingsDefaults),
        pricing: structuredClone(DEFAULT_PRICING),
        featureToggles: this.memory.featureToggles,
      });
      doc = doc.toObject();
    }
    this.memory = doc;
    return doc;
  }

  getSettings() {
    return { ...PropertyMobilitySettingsDefaults, ...(this.memory.settings || {}) };
  }

  getPricing() {
    return { ...DEFAULT_PRICING, ...(this.memory.pricing || {}) };
  }

  getFeatureToggles() {
    const settings = this.getSettings();
    return {
      ...this.memory.featureToggles,
      verification: settings.verification?.enabled !== false,
      agencies: settings.agencies?.enabled !== false,
    };
  }

  getAgencyLimits() {
    const agencies = this.getSettings().agencies || {};
    return {
      unlimitedListings: agencies.unlimitedListings !== false,
      maxListings: Number(agencies.maxListings) || 0,
    };
  }

  getHomepagePromotionLimit() {
    const promotions = this.getSettings().promotions || {};
    return Number(promotions.homepagePromotionLimit) || 12;
  }

  _applyFeatureToggleToSettings(nextSettings, nextToggles) {
    if (nextToggles.verification !== undefined) {
      nextSettings.verification = {
        ...nextSettings.verification,
        enabled: nextToggles.verification !== false,
      };
    }
    if (nextToggles.agencies !== undefined) {
      nextSettings.agencies = {
        ...nextSettings.agencies,
        enabled: nextToggles.agencies !== false,
      };
    }
    return nextSettings;
  }

  async updateConfiguration(partial = {}, meta = {}) {
    const nextSettings = { ...this.getSettings(), ...(partial.settings || {}) };
    const nextPricing = { ...this.getPricing(), ...(partial.pricing || {}) };
    const nextToggles = { ...this.getFeatureToggles(), ...(partial.featureToggles || {}) };

    for (const key of Object.keys(PropertyMobilitySettingsDefaults)) {
      if (
        PropertyMobilitySettingsDefaults[key] &&
        typeof PropertyMobilitySettingsDefaults[key] === "object" &&
        partial.settings?.[key]
      ) {
        nextSettings[key] = {
          ...PropertyMobilitySettingsDefaults[key],
          ...partial.settings[key],
        };
      }
    }

    this._applyFeatureToggleToSettings(nextSettings, partial.featureToggles || {});

    if (this.useMemoryOnly || !this.ConfigModel) {
      this.memory = {
        key: "global",
        settings: nextSettings,
        pricing: nextPricing,
        featureToggles: {
          ...nextToggles,
          verification: nextSettings.verification?.enabled !== false,
          agencies: nextSettings.agencies?.enabled !== false,
        },
        updatedBy: meta.admin || "system",
      };
      await this._syncPlatformFlags();
      return this.memory;
    }

    const doc = await this.ConfigModel.findOneAndUpdate(
      { key: "global" },
      {
        $set: {
          settings: nextSettings,
          pricing: nextPricing,
          featureToggles: {
            ...nextToggles,
            verification: nextSettings.verification?.enabled !== false,
            agencies: nextSettings.agencies?.enabled !== false,
          },
          updatedBy: meta.admin || "system",
        },
      },
      { upsert: true, new: true }
    );
    this.memory = doc.toObject();
    await this._syncPlatformFlags();
    return this.memory;
  }

  async _syncPlatformFlags() {
    if (this.useMemoryOnly) return;
    try {
      const { getPlatformIntegration } = require("../integration/PlatformIntegration");
      const integration = getPlatformIntegration();
      const current = await integration.featureFlags.getFlags();
      const settings = this.getSettings();
      const patch = {};
      for (const [key, value] of Object.entries(settings)) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          patch[key] = { ...value, enabled: value.enabled !== false };
        }
      }
      await integration.featureFlags.store.updateFlags({
        propertyMobility: { ...(current.propertyMobility || {}), ...patch },
      });
      await integration.featureFlags.refresh();
    } catch (_error) {
      // optional during isolated tests
    }
  }
}

module.exports = PropertyMobilityConfigStore;

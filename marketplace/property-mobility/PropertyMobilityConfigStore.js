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
    return { ...this.memory.featureToggles };
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

    if (this.useMemoryOnly || !this.ConfigModel) {
      this.memory = {
        key: "global",
        settings: nextSettings,
        pricing: nextPricing,
        featureToggles: nextToggles,
        updatedBy: meta.admin || "system",
      };
      return this.memory;
    }

    const doc = await this.ConfigModel.findOneAndUpdate(
      { key: "global" },
      { $set: { settings: nextSettings, pricing: nextPricing, featureToggles: nextToggles, updatedBy: meta.admin || "system" } },
      { upsert: true, new: true }
    );
    this.memory = doc.toObject();
    return this.memory;
  }
}

module.exports = PropertyMobilityConfigStore;

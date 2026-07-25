const {
  TrustBuyerProtectionSettingsDefaults,
  DEFAULT_POLICIES,
  DEFAULT_TRUST_WEIGHTS,
} = require("./TrustBuyerProtectionSettingsDefaults");

class TrustBuyerProtectionConfigStore {
  constructor({ useMemoryOnly = false, ConfigModel = null } = {}) {
    this.useMemoryOnly = useMemoryOnly;
    this.ConfigModel = ConfigModel;
    this.memory = {
      key: "global",
      settings: structuredClone(TrustBuyerProtectionSettingsDefaults),
      policies: structuredClone(DEFAULT_POLICIES),
      trustWeights: structuredClone(DEFAULT_TRUST_WEIGHTS),
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
        settings: structuredClone(TrustBuyerProtectionSettingsDefaults),
        policies: structuredClone(DEFAULT_POLICIES),
        trustWeights: structuredClone(DEFAULT_TRUST_WEIGHTS),
      });
      doc = doc.toObject();
    }
    this.memory = doc;
    return doc;
  }

  getSettings() {
    return { ...TrustBuyerProtectionSettingsDefaults, ...(this.memory.settings || {}) };
  }

  getPolicies() {
    return { ...DEFAULT_POLICIES, ...(this.memory.policies || {}) };
  }

  getTrustWeights() {
    return { ...DEFAULT_TRUST_WEIGHTS, ...(this.memory.trustWeights || {}) };
  }

  async updateConfiguration(partial = {}, meta = {}) {
    const nextSettings = { ...this.getSettings(), ...(partial.settings || {}) };
    const nextPolicies = { ...this.getPolicies(), ...(partial.policies || {}) };
    const nextWeights = { ...this.getTrustWeights(), ...(partial.trustWeights || {}) };

    for (const key of Object.keys(TrustBuyerProtectionSettingsDefaults)) {
      if (
        TrustBuyerProtectionSettingsDefaults[key] &&
        typeof TrustBuyerProtectionSettingsDefaults[key] === "object" &&
        partial.settings?.[key]
      ) {
        nextSettings[key] = {
          ...TrustBuyerProtectionSettingsDefaults[key],
          ...partial.settings[key],
        };
      }
    }

    if (partial.policies?.refundRules) {
      nextPolicies.refundRules = {
        ...this.getPolicies().refundRules,
        ...partial.policies.refundRules,
      };
    }
    if (partial.policies?.verificationRequirements) {
      nextPolicies.verificationRequirements = {
        ...this.getPolicies().verificationRequirements,
        ...partial.policies.verificationRequirements,
      };
    }

    if (this.useMemoryOnly || !this.ConfigModel) {
      this.memory = {
        key: "global",
        settings: nextSettings,
        policies: nextPolicies,
        trustWeights: nextWeights,
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
          policies: nextPolicies,
          trustWeights: nextWeights,
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
        trustBuyerProtection: { ...(current.trustBuyerProtection || {}), ...patch },
      });
      await integration.featureFlags.refresh();
    } catch (_error) {
      // optional during isolated tests
    }
  }
}

module.exports = TrustBuyerProtectionConfigStore;
